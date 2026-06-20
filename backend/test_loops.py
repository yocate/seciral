import sqlite3
from collections import defaultdict

def find_loops():
    conn = sqlite3.connect("data/knowledge.db")
    cursor = conn.cursor()
    cursor.execute("SELECT source, target, label, confidence FROM graph_edges")
    edges = cursor.fetchall()
    
    cursor.execute("SELECT id, name FROM graph_nodes")
    nodes = {r[0]: r[1] for r in cursor.fetchall()}
    
    # Build graph
    adj = defaultdict(list)
    edge_map = {}
    for e in edges:
        s, t, label, conf = e
        adj[s].append(t)
        edge_map[(s, t)] = {"label": label, "reason": ""}

    loops = []
    
    # DFS for simple cycles up to length 5
    def dfs(node, start_node, path, visited):
        if len(path) > 5:
            return
        if node in visited:
            if node == start_node and len(path) > 1:
                # Found cycle
                loops.append(list(path))
            return
            
        visited.add(node)
        path.append(node)
        for neighbor in adj[node]:
            dfs(neighbor, start_node, path, visited)
        path.pop()
        visited.remove(node)
        
    for node in list(adj.keys()):
        dfs(node, node, [], set())
        
    # Deduplicate loops (e.g. A->B->C is same as B->C->A)
    unique_loops = []
    seen_sets = set()
    for loop in loops:
        frozen = frozenset(loop)
        if frozen not in seen_sets:
            seen_sets.add(frozen)
            unique_loops.append(loop)
            
    print(f"Found {len(unique_loops)} unique loops.")
    for loop in unique_loops:
        print(" -> ".join([nodes.get(n, n) for n in loop]) + " -> " + nodes.get(loop[0], loop[0]))

if __name__ == "__main__":
    find_loops()
