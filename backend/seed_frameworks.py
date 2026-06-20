import sqlite3
import datetime

db_path = "data/knowledge.db"

frameworks = [
    ("porter_5forces", "ポジショニング理論（Porter 5フォース）", "市場構造分析「どこで戦うか」", "MVP必須"),
    ("vrio", "資源ベースビュー／VRIO（Barney）", "内部資源評価「何で戦うか」", "MVP必須"),
    ("errc", "ブルーオーシャン戦略／ERRC（Kim & Mauborgne）", "市場の再定義", "拡張"),
    ("dynamic_capabilities", "動態的能力論（Teece）", "変化適応力の評価", "拡張"),
    
    ("pestel", "PESTEL分析", "マクロ環境の網羅把握", "MVP必須"),
    ("zachman", "Zachmanフレームワーク", "組織文脈の多角的把握・対話設計の核", "MVP必須"),
    
    ("bmc", "ビジネスモデルキャンバス（Osterwalder）", "事業の仕組みの検証", "MVP必須"),
    ("pcf", "PCF（APQC プロセス分類）", "As-Is棚卸し／To-Be設計／WBS変換", "拡張"),
    ("bsc", "バランスト・スコアカード（Kaplan & Norton）", "戦略のKPI化", "拡張"),
    
    ("pmbok", "PMBOK（PMI）", "リスク管理・WBS変換", "拡張"),
    ("okr", "OKR", "戦略を追跡可能な目標体系へ", "拡張"),
    
    ("scenario_planning", "シナリオプランニング", "楽観・基本・悲観の構造化", "MVP必須"),
    ("cynefin", "Cynefinフレームワーク（Snowden）", "問題の性質判定と対応選択", "拡張"),
    ("ooda", "OODAループ（Boyd）", "継続的な観察・修正サイクル", "拡張"),
    
    ("nadler_tushman", "Nadler-Tushman整合性モデル", "組織としての実行可能性検証", "拡張"),
    ("greiner", "Greinerの成長モデル", "組織フェーズの特定", "拡張"),
    
    ("togaf", "TOGAF（ADM）", "ビジネス→システム実装設計", "将来"),
    ("archimate", "ArchiMate / C4", "EA可視化・モデリング", "将来"),
    ("itil_4", "ITIL 4", "ITサービス運用の継続改善", "将来"),
    ("cobit_2019", "COBIT 2019", "ITガバナンス・統制", "将来"),
    ("iso_42010", "ISO/IEC 42010", "アーキテクチャ記述標準", "将来"),
    ("iso_27001", "ISO 27001 / NIST CSF", "情報セキュリティ・リスク管理", "将来"),
    
    ("seci", "SECIモデル（Nonaka & Takeuchi）", "暗黙知の形式知化", "拡張"),
    ("diversity_theorem", "多様性効果（Doshi et al., 2024）", "AI多様性集計の科学的根拠", "MVP必須"),
    ("fcm", "ファジィ認知地図 FCM（Kosko）", "動的因果シミュレーション", "将来"),
    ("dsr", "デザインサイエンス研究 DSR（Hevner）", "開発・検証の方法論", "MVP必須"),
    
    ("system_dynamics", "システムダイナミクス（Forrester）", "因果と時間遅れの扱い", "将来"),
    ("cld", "因果ループ図 CLD（Senge）", "相互関係の可視化", "拡張"),
    ("system_archetypes", "システムアーキタイプ（Senge）", "失敗の型のカタログ", "拡張"),
    ("leverage_points", "レバレッジポイント（Meadows）", "最小介入点の特定", "将来"),
    ("ssm", "ソフトシステム方法論 SSM（Checkland）", "境界設定と多視点統合", "将来"),
    
    ("boden_creativity", "Bodenの創造性3類型", "創発の段階設計（背骨）", "拡張"),
    ("triz", "TRIZ（40原理・矛盾マトリクス）", "矛盾の創造的解消", "将来"),
    ("conceptual_blending", "概念ブレンド（Fauconnier & Turner）", "異概念の強制結合", "将来"),
    ("lateral_thinking", "ラテラルシンキング（de Bono）", "制御された偶然性の注入", "将来"),
    ("novelty_search", "ノベルティサーチ（Lehman & Stanley）", "新規性駆動の探索", "将来"),
    ("map_elites", "Quality-Diversity / MAP-Elites", "多様な高性能解の保持", "将来")
]

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# テーブルクリア
cursor.execute("DELETE FROM utilized_frameworks")

now = datetime.datetime.now().isoformat()

for fw_id, name, desc, priority in frameworks:
    cursor.execute("""
        INSERT INTO utilized_frameworks (id, name, description, reference_count, updated_at, priority)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (fw_id, name, desc, 0, now, priority))

conn.commit()
conn.close()
print("Frameworks seeded successfully.")
