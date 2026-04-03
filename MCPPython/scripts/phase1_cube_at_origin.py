#!/usr/bin/env python3
"""Phase 1 verification: spawn a test cube at world origin (0, 0, 0).

The Unreal Editor must be running with the ExpoVR project loaded. UnrealMCP opens a TCP
**server** on 127.0.0.1:55557 inside the editor — this script is a client. You do not
need to run unreal_mcp_server.py for this check.
"""
import json
import logging
import socket
import subprocess
import sys
from typing import Any, Dict, Optional

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("phase1")


def _print_port_hint() -> None:
    try:
        r = subprocess.run(
            ["lsof", "-nP", "-iTCP:55557", "-sTCP:LISTEN"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if r.stdout.strip():
            logger.info("Something is listening on 55557:\n%s", r.stdout.strip())
        else:
            logger.info("Nothing is listening on TCP 55557 (lsof returned no LISTEN).")
    except Exception as e:
        logger.info("Could not run lsof (optional): %s", e)

    logger.info(
        "\nChecklist:\n"
        "  1. Launch Unreal **Editor** (not a packaged game, not PIE-only from another project).\n"
        "  2. Open **ExpoVR.uproject** — wait until the project finishes compiling shaders/plugins.\n"
        "  3. Edit → Plugins → search **UnrealMCP** → Enabled → restart editor if prompted.\n"
        "  4. Window → Developer Tools → **Output Log** — look for:\n"
        "       'UnrealMCPBridge: Server started on 127.0.0.1:55557'\n"
        "     If you see 'Failed to bind', another app may be using the port.\n"
        "  5. Run this script again while the editor stays open.\n"
    )


def send_command(command: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(30.0)
        sock.connect(("127.0.0.1", 55557))
        try:
            payload = json.dumps({"type": command, "params": params}).encode("utf-8")
            sock.sendall(payload)
            chunks = []
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                chunks.append(chunk)
                try:
                    json.loads(b"".join(chunks).decode("utf-8"))
                    break
                except json.JSONDecodeError:
                    continue
            return json.loads(b"".join(chunks).decode("utf-8"))
        finally:
            sock.close()
    except ConnectionRefusedError:
        logger.error("Connection refused on 127.0.0.1:55557 — the editor is not listening.")
        _print_port_hint()
        return None
    except Exception as e:
        logger.error("TCP bridge error: %s", e)
        _print_port_hint()
        return None


def main() -> None:
    r = send_command(
        "create_actor",
        {
            "name": "Phase1_TestCube_Origin",
            "type": "StaticMeshActor",
            "location": [0.0, 0.0, 0.0],
            "rotation": [0.0, 0.0, 0.0],
            "scale": [1.0, 1.0, 1.0],
        },
    )
    if not r:
        logger.error("No response from Unreal.")
        _print_port_hint()
        sys.exit(2)
    logger.info("Response: %s", r)
    if r.get("status") != "success":
        sys.exit(1)
    logger.info("Phase 1 cube check passed (actor created at 0,0,0).")


if __name__ == "__main__":
    main()
