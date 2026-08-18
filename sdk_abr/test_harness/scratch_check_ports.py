import psutil
import socket

def find_procs_by_port(port):
    procs = []
    for conn in psutil.net_connections():
        if conn.laddr.port == port:
            try:
                proc = psutil.Process(conn.pid)
                procs.append(proc)
            except Exception:
                pass
    return procs

for port in [8000, 8009]:
    procs = find_procs_by_port(port)
    print(f"Port {port}:")
    if not procs:
        print("  No processes listening.")
    for p in procs:
        print(f"  PID: {p.pid} | Name: {p.name()} | Cmdline: {p.cmdline()}")
