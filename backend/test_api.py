from knowledge.database import init_db
from collections import defaultdict

db = init_db()
print(db.table_names())
if "graph_edges" not in db.table_names():
    print("graph_edges not found!")
else:
    print("graph_edges found!")
    
edges = list(db.query("SELECT source, target, label, confidence FROM graph_edges"))
print("edges len:", len(edges))
