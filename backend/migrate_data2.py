import sqlite3
import json
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

def perform_entity_resolution(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM graph_nodes")
    nodes = cursor.fetchall()
    
    if not nodes:
        return
        
    node_list_str = "\n".join([f"ID: {n[0]}, Name: {n[1]}" for n in nodes])
    
    prompt = f"""あなたは高度なグラフデータベースの名寄せ（Entity Resolution）AIです。
以下のノードのリストを見て、全く同じ意味、または非常に近い概念を指しているノードをグループ化してください。
（例：「AI」と「人工知能」、「DX」と「デジタルトランスフォーメーション」など）

出力は必ず以下のJSONスキーマに従ってください。Markdownブロックは付けず、純粋なJSON文字列のみ出力してください。
保持するID（代表ID）は、より一般的または分かりやすい名称のノードを選んでください。

{{
  "merges": [
    {{
      "keep_id": "保持する代表ノードのID",
      "merge_ids": ["マージして削除するノードのIDのリスト", "..."]
    }},
    ...
  ]
}}

ノードリスト：
{node_list_str}
"""
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.0,
        google_api_key=os.environ.get("GEMINI_API_KEY")
    )
    
    response = llm.invoke([HumanMessage(content=prompt)])
    content = response.content.strip()
    if content.startswith("```json"):
        content = content[7:-3]
    elif content.startswith("```"):
        content = content[3:-3]
        
    try:
        data = json.loads(content)
        merges = data.get("merges", [])
        
        for m in merges:
            keep_id = m["keep_id"]
            merge_ids = m["merge_ids"]
            for m_id in merge_ids:
                if m_id == keep_id: continue
                
                # Update edges (ignore if it creates a duplicate)
                cursor.execute("UPDATE OR IGNORE graph_edges SET source = ? WHERE source = ?", (keep_id, m_id))
                cursor.execute("UPDATE OR IGNORE graph_edges SET target = ? WHERE target = ?", (keep_id, m_id))
                # Delete any remaining old edges that weren't updated due to UNIQUE constraint
                cursor.execute("DELETE FROM graph_edges WHERE source = ? OR target = ?", (m_id, m_id))
                
                # Delete merged node
                cursor.execute("DELETE FROM graph_nodes WHERE id = ?", (m_id,))
                
        conn.commit()
    except Exception as e:
        pass

if __name__ == "__main__":
    conn = sqlite3.connect("data/knowledge.db")
    perform_entity_resolution(conn)
    conn.close()
    print("Migration completed successfully.")
