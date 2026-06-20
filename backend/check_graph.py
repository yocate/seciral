from knowledge.database import init_db
db = init_db()
nodes = {r["id"] for r in db.query("SELECT id FROM graph_nodes")}
edges = list(db.query("SELECT source, target FROM graph_edges"))

missing = 0
for e in edges:
    if e["source"] not in nodes or e["target"] not in nodes:
        print(f"Missing node for edge {e}")
        missing += 1

print(f"Total missing: {missing}")
