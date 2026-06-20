import os
import json
from api.llm_factory import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
from knowledge.database import get_all_frameworks

SYSTEM_PROMPT = """あなたは高度な因果ループ・ナレッジグラフ抽出AIです。
ユーザーから提供される「入力情報（対話や資料）」と「現在のグラフ状態」から、戦略上の重要な要素（ノード）と、それらの関係性（エッジ・因果関係）を抽出してください。

出力は必ず以下のJSONスキーマに従うこと。Markdownブロック（```json ... ```）は付けず、純粋なJSON文字列のみを出力してください。

{
  "nodes": [
    {"id": "ユニークな英語ID", "name": "具体的な日本語用語または抽象概念", "group": "challenge|strategy|resource|environment|metric", "layer": "specific|abstract", "description": "このノードが何であるかの具体的な説明や文脈"}
  ],
  "links": [
    {"source": "元のノードID", "target": "先のノードID", "label": "関係性を表す短い日本語", "reason": "なぜこの因果関係が生じるのかの具体的な理由や文脈", "confidence": 確信度(1から5の整数。飛躍がないほど高くする)}
  ],
  "frameworks": [
    {"name": "フレームワーク名（例: PMBOK, SWOT分析, ITIL等）", "description": "どのように活用・言及されたかの簡単な説明"}
  ]
}

【重要要件（サイエンスに基づく名寄せ・Entity Resolution）】
1. **名寄せの徹底**: 「現在のグラフ状態」が提供されている場合、新しく抽出した概念が**既存のグラフ内のノードと意味的に同一または非常に近い場合（例：「AI」と「人工知能」、「DX」と「デジタルトランスフォーメーション」等）は、絶対に新しいIDを作らず、既存のノードIDを再利用（Merge）してください。**これにより知識が分断されず真に結合（Combination）されます。
2. 対話の中で言及された「具体的な専門用語」「固有の課題名」を漏らさず「具体（layer: "specific"）」ノードとして拾い上げてください。
3. 同時に、それらの具体的な事象の背後にある「抽象的なビジネスモデルや構造・メタ概念」を推論し、「抽象（layer: "abstract"）」ノードとして抽出してください。
4. そして、具体ノードと抽象ノードの間を `label: "抽象化"` として結びつけてください。
5. ノード数は具体と抽象を合わせて **15〜30個** 程度を抽出し、詳細な関係性をマッピングしてください。
6. nodesとlinksのIDは必ず一致している必要があります。
7. 【フレームワークの積極的活用】以下の「組織で定義された公式フレームワーク一覧」を参考にして、該当する分析手法が含まれている場合は、積極的に構造化し抽出してください。

{framework_list}
"""

def extract_graph(session_id: str, input_text: str, current_graph_text: str, input_type: str = "対話履歴", strategic_persona: str = "") -> dict:
    llm = get_llm(temperature=0.2)
    
    # 登録済みフレームワークの取得とフォーマット
    fws = get_all_frameworks()
    mvp_fws = [fw for fw in fws if fw.get("priority") == "MVP必須"]
    fw_text = "■ 組織の公式フレームワーク辞書（MVP必須）\n"
    if mvp_fws:
        for fw in mvp_fws:
            fw_text += f"- {fw['name']}: {fw['description']}\n"
    else:
        fw_text += "（現在登録されている中核フレームワークはありません）\n"
        
    system_prompt_formatted = SYSTEM_PROMPT.replace("{framework_list}", fw_text)
    
    user_context = ""
    if strategic_persona:
        user_context = f"【情報提供者の背景（メタコンテキスト）】\nこの情報は以下の特性を持つ人物からの視点です。この背景を考慮して、暗黙の意図やなぜその因果関係を主張しているのかを深く推論してグラフ化してください。\n- 戦略的ペルソナ・思考特性: {strategic_persona}\n\n"
    
    context = f"【現在のナレッジグラフ】\n{current_graph_text}\n\n{user_context}【追加の入力情報（{input_type}）】\n{input_text}\n\n上記の情報を統合し、入力情報に含まれる新たな戦略的要素や因果関係を抽出し、現在のナレッジグラフを差分更新する形で出力してください。"
    
    messages = [
        SystemMessage(content=system_prompt_formatted),
        HumanMessage(content=context)
    ]
    
    response = llm.invoke(messages)
    
    # パース処理（LLMがマークダウンブロックを返した場合のフェイルセーフ）
    raw_text = response.content.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
        
    try:
        data = json.loads(raw_text.strip())
        if "frameworks" not in data:
            data["frameworks"] = []
        return data
    except Exception as e:
        print("Failed to parse JSON:", e)
        print("Raw output:", raw_text)
        # Fallback empty graph
        return {"nodes": [], "links": [], "frameworks": []}

META_INSIGHT_PROMPT = """あなたは高度な「システム思考」および「戦略メタ認知」のエキスパートです。
ユーザーから提供される「巨大なナレッジグラフ（ノードと因果関係のリスト）」全体を俯瞰し、局所的な事象の背後にある「抽象的な構造（システムアーキタイプ）」や「メタ知見」を抽出してください。

出力は必ず以下のJSONスキーマに従うこと。Markdownブロック（```json ... ```）は付けず、純粋なJSON文字列のみを出力してください。

{
  "archetypes": [
    {
      "name": "アーキタイプ名（例: 問題のすり替え, 成長の限界, 共有地の悲劇 等）",
      "description": "なぜこのアーキタイプが該当するのかの具体的な説明",
      "nodes_involved": ["関連するノード名1", "関連するノード名2"]
    }
  ],
  "meta_narrative": "グラフ全体から読み取れる、組織の『根深い構造的課題』や『最大のレバレッジポイント（介入点）』を物語（ナラティブ）として200〜300文字程度で分かりやすく説明してください。",
  "new_insights": [
    "箇条書きでの新しい発見や示唆1",
    "箇条書きでの新しい発見や示唆2"
  ]
}

【重要要件】
1. システム思考（System Dynamics）の観点で、フィードバックループ（強化ループ・バランスループ）を見つけ出してください。
2. 表面的な事象の羅列ではなく、「要するにどういうことか」という抽象度を高めたインサイトを必ず出してください。
"""

def extract_meta_insights(graph_data: dict) -> dict:
    llm = get_llm(model="gemini-2.5-pro", temperature=0.4)
    
    nodes = [n.get("name", "") for n in graph_data.get("nodes", [])]
    edges = [f"{e.get('source')} --({e.get('label')})--> {e.get('target')} (理由: {e.get('reason','')})" for e in graph_data.get("links", [])]
    
    graph_text = "【現在のノード群】\n" + ", ".join(nodes) + "\n\n【因果関係（エッジ）】\n" + "\n".join(edges)
    
    messages = [
        SystemMessage(content=META_INSIGHT_PROMPT),
        HumanMessage(content=graph_text)
    ]
    
    response = llm.invoke(messages)
    
    raw_text = response.content.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
        
    try:
        data = json.loads(raw_text.strip())
        return data
    except Exception as e:
        print("Failed to parse Meta Insights JSON:", e)
        print("Raw output:", raw_text)
        return {"archetypes": [], "meta_narrative": "メタ知見の抽出に失敗しました。", "new_insights": []}

