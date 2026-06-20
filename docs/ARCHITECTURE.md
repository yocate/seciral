# Architecture & Design Document

## 1. System Architecture

SECIral は、モジュラーモノリス型のアーキテクチャを採用しており、フロントエンド（React SPA）とバックエンド（FastAPI）で構成されています。

### 1.1. Frontend Architecture
- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **Design Pattern**: 肥大化を防ぐため、UIコンポーネント（View層）からデータフェッチ・状態管理・ビジネスロジック（Model/Controller層）をカスタムフック（`hooks/`）として分離する構成を採用しています。
  - `useProjects.ts`: プロジェクト・履歴の管理
  - `useDiagnosticChat.ts`: チャット履歴およびレビューロジック
  - `useCausalLoopGraph.ts`: ナレッジグラフの取得と計算処理

### 1.2. Backend Architecture
- **Framework**: FastAPI (Python)
- **Design Pattern**: `main.py`を軽量なエントリポイントとし、各ビジネスドメインごとにエンドポイント（`routers/`）を分割する構造（Router/Controller パターン）を採用しています。
  - `routers/auth.py`: 認証・プロファイル管理
  - `routers/projects.py`: ワークスペース・セッション管理
  - `routers/documents.py`: ナレッジソースの管理・CRUD
  - `routers/knowledge.py`: GraphRAG、グラフ抽出、因果ループ生成アルゴリズム
  - `routers/diagnostic.py`: チャットAPI、LLMとの対話パイプライン
- **LLM Engine**: Google Gemini (LangChainを使用し、Graph extractionやSystem Dynamicsの推論プロンプトを管理)

---

## 2. Database Schema (SQLite)

本システムは、初期構築のスピードと移植性を重視し、軽量な SQLite (`sqlite-utils`) を使用していますが、将来的なPostgreSQL等へのマイグレーションを考慮したRDBMSライクなスキーマ設計を採用しています。

### 2.1. コアエンティティ

#### `users`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | ユーザー固有ID |
| `email` | TEXT | メールアドレス |
| `password_hash` | TEXT | ハッシュ化されたパスワード |
| `display_name` | TEXT | 表示名 |
| `department` | TEXT | 部署（グラフノードのメタデータに継承される） |
| `strategic_persona` | TEXT | LLMがプロンプト生成時に参照する思考の癖・役職情報 |

#### `projects`
チャット履歴や特定の分析スコープを区切るためのセッションコンテナです。
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | プロジェクトID |
| `name` | TEXT | プロジェクト名 |
| `description` | TEXT | 説明 |

#### `documents`
ナレッジの源泉（Source of Truth）となるテキストドキュメントのメタデータです。
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER (PK) | ドキュメントID |
| `filename` | TEXT | ファイル名 |
| `content` | TEXT | 抽出された生テキスト |
| `summary` | TEXT | LLMによって要約された概要 |
| `project_id` | TEXT | 所属プロジェクト（NULLの場合はGlobalナレッジ） |

---

### 2.2. Temporal Knowledge Graph エンティティ

ナレッジグラフは「ノード（概念）」と「エッジ（関係）」の2つのテーブルで表現されます。すべてのレコードに時間的制約（`valid_from`, `valid_to`）とメタデータを持たせることで、トレーサビリティと時間経過による情報の陳腐化に対応します。

#### `graph_nodes`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | ノードのユニークID（自然言語の概念名がベース） |
| `project_id` | TEXT | 所属スコープ（"global" または特定のプロジェクトID） |
| `name` | TEXT | 表示名 |
| `group` | TEXT | ノードのカテゴリ（例："課題", "戦略", "外部環境"） |
| `author` | TEXT | このノードを生成するきっかけとなったユーザー |
| `valid_from` | TEXT | この概念が有効になった日時 |
| `valid_to` | TEXT | 無効化日時（論理削除用） |

#### `graph_edges`
| Column | Type | Description |
| :--- | :--- | :--- |
| `source` | TEXT | 送信元ノードID |
| `target` | TEXT | 送信先ノードID |
| `project_id` | TEXT | 所属スコープ |
| `label` | TEXT | エッジのラベル（例："影響を与える", "依存する"） |
| `confidence` | INTEGER | LLMによる抽出の確信度（1-10） |
| `valid_from` | TEXT | 有効開始日時 |
| `valid_to` | TEXT | 無効化日時（矛盾が発生した場合に過去のエッジを無効化する） |

---

## 3. Data Flow & Processing

### 3.1. ナレッジ取り込み (Knowledge Ingestion Pipeline)
1. **アップロード**: ユーザーがPDF/Markdown等のファイルをアップロード（`POST /api/ingest`）。
2. **テキスト抽出**: バックグラウンドタスクでドキュメントのテキスト化・チャンク化を実行。
3. **要約・保存**: LLMがサマリーを生成し、`documents`テーブルへ保存。
4. **Graph Extraction**: ドキュメント本文と現在のナレッジグラフ（`graph_nodes`, `graph_edges`）をプロンプトとしてLLMに渡し、差分（新しいノードとエッジ）を抽出。
5. **Upsert**: 抽出されたグラフデータをDBへインクリメンタルにマージ。既存のノードと競合する場合はスコアを更新。

### 3.2. 因果ループ探索 (Causal Loop Discovery)
1. **グラフ構築**: `graph_edges`から隣接リスト（Adjacency List）をメモリ上に構築。
2. **DFS（深さ優先探索）**: 全てのノードを起点として、深さ4〜5以内で元のノードに戻る閉路（Cycle）を探索。
3. **評価（Evaluation）**: 発見された各ループ（閉路）をLLMへ送信。「Reinforcing（自己強化ループ）」か「Balancing（バランスループ）」かをシステム力学の理論に基づいて判定。

---

## 4. セキュリティと将来の拡張計画

- **現在の課題**: SQLiteを使用した同期的なDBアクセスがボトルネックになる可能性があります。
- **拡張計画**: 
  1. `SQLAlchemy` の導入と非同期対応（`asyncio`）。
  2. 大規模なグラフ探索をより高速化するために、Neo4j などのグラフ専用データベースへのマイグレーション。
  3. API認証の強靭化（OAuth2 / JWT Tokenベースの認可パイプラインの導入）。
