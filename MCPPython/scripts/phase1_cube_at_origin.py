#!/usr/bin/env python3
"""Phase 1 verification: spawn a test cube at world origin (0, 0, 0). Requires Unreal Editor with ExpoVR open and UnrealMCP plugin active."""
import json
import logging
import socket
import sys
from typing import Any, Dict, Optional

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("phase1")


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
    except Exception as e:
        logger.error("TCP bridge error: %s", e)
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
        logger.error("No response — is Unreal Editor running with the project loaded?")
        sys.exit(2)
    logger.info("Response: %s", r)
    if r.get("status") != "success":
        sys.exit(1)
    logger.info("Phase 1 cube check passed (actor created at 0,0,0).")


if __name__ == "__main__":
    main()
