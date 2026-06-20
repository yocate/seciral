import os
from typing import Annotated, TypedDict
from api.llm_factory import get_llm
from langchain_core.messages import SystemMessage, HumanMessage, AnyMessage, AIMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3

class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]

SYSTEM_PROMPT = """あなたは組織の戦略立案プラットフォームにおけるAI専門家チーム（The Analyst, Devil's Advocate, The Synthesizer）を統括するリード・コンサルタントです。
現在、ユーザーは自身の作成した「成果物」や「戦略アイデア」に対して高度なレビューや壁打ちを求めています。

あなたの目的は、**提供されたTemporal Knowledge Graph（過去の知見の蓄積）と照らし合わせ、ユーザーの成果物や発言に対する矛盾の指摘、抜け漏れの発見、および過去の成功/失敗パターンからの類推（アナロジー）を提示し、成果物をより強固なものへ昇華させること**です。

【重要ルール】
回答を生成するにあたり、必ず以下のプロセス（内部シミュレーション）を可視化フォーマットで出力し、その後に最終回答を提示してください。

<details>
<summary>🧠 AI専門家チームの検討プロセス</summary>
**🧑‍💼 The Analyst (仮説立案):**
[提供されたコンテキストやグラフに基づき、ユーザーの状況を客観的に構造化し、戦略仮説を立案する。2〜3行]

**😈 Devil's Advocate (批判的検証):**
[Analystの仮説やユーザーのアイデアに対し、最悪のシナリオや矛盾、実行不可能性などのリスクを厳しく突く。2〜3行]
</details>

[ここからThe Synthesizerとしてのユーザーへの最終的な回答。AnalystとDevilの意見を統合し、成果物の品質を高めるための具体的な質問や洞察を必ず含めること。短くシンプルな問いかけで会話のキャッチボールを行うこと。]
"""

EVALUATOR_PROMPT = """あなたはRAG（Retrieval-Augmented Generation）システムの客観的な評価エージェントです。
提供された「システムが持つナレッジ（Context）」と、それに基づいて「AIが生成した回答（Answer）」を比較し、**Faithfulness（忠実性：回答がコンテキストにのみ基づいているか、幻覚がないか）**を評価してください。

必ず以下の `<evaluation>` タグで囲んだ JSON 形式のデータを1つだけ出力してください。
<evaluation>
{
  "confidence": "High" または "Medium" または "Low",
  "reason": "なぜその信頼度なのかの簡潔な理由（例：システム内の特定のドキュメントの記述に完全に依拠しているため、等）",
  "sources": ["依拠したノード名やエッジ", "依拠した資料名"]
}
</evaluation>
"""

def create_agent():
    llm = get_llm(temperature=0.7)
    
    evaluator_llm = get_llm(temperature=0.0)

    def chat_node(state: State):
        messages = state["messages"]
        recent_messages = messages[-10:] if len(messages) > 10 else messages
        
        # 内面化（Internalization）のフィードバックループ：過去のインサイトを注入
        from knowledge.database import get_latest_insight
        latest_insight = get_latest_insight()
        insight_context = ""
        if latest_insight:
            insight_context = f"\n\n【過去に抽出された組織の重要な知見（インサイト）】\n{latest_insight}\nこれらを踏まえ、以前の議論からの成長や連続性を意識してレビューを行ってください。"
        
        sys_msg = SystemMessage(content=SYSTEM_PROMPT + insight_context)
        msgs = [sys_msg] + recent_messages
        response = llm.invoke(msgs)
        answer_content = response.content
        
        # Evaluate Faithfulness
        context_text = sys_msg.content # For simplicity, assuming context is injected in previous messages or sys_msg
        # To be more precise, we extract the actual context from the first user message or system prompt.
        eval_prompt = f"{EVALUATOR_PROMPT}\n\n【生成された回答】\n{answer_content}"
        eval_response = evaluator_llm.invoke([SystemMessage(content=eval_prompt)])
        
        # Combine answer and evaluation
        eval_text = eval_response.content
        # Extract <evaluation> tag if it exists
        if "<evaluation>" in eval_text and "</evaluation>" in eval_text:
            start_idx = eval_text.find("<evaluation>")
            end_idx = eval_text.find("</evaluation>") + len("</evaluation>")
            evaluation_block = eval_text[start_idx:end_idx]
        else:
            evaluation_block = "<evaluation>\n{\"confidence\": \"Low\", \"reason\": \"評価エージェントによる検証失敗\", \"sources\": []}\n</evaluation>"
            
        final_content = f"{answer_content}\n\n{evaluation_block}"
        return {"messages": [AIMessage(content=final_content)]}

    workflow = StateGraph(State)
    workflow.add_node("chat", chat_node)
    workflow.add_edge(START, "chat")
    workflow.add_edge("chat", END)

    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect("data/checkpoints.db", check_same_thread=False)
    memory = SqliteSaver(conn)

    app = workflow.compile(checkpointer=memory)
    return app

# Singleton agent instance
agent_app = None

def get_agent():
    global agent_app
    if agent_app is None:
        agent_app = create_agent()
    return agent_app
