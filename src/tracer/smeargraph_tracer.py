import sys
import json
import os
import time
from pathlib import Path

OUTPUT_FILE = os.environ.get("SMEARGRAPH_TRACE_OUTPUT", "/tmp/smeargraph_trace.jsonl")
TRACE_DEPTH = int(os.environ.get("SMEARGRAPH_TRACE_DEPTH", "10"))
TRACE_MODULE_FILTER = os.environ.get("SMEARGRAPH_TRACE_MODULE", "")
_trace_file = None
_trace_depth = 0
_event_count = 0
_MAX_EVENTS = int(os.environ.get("SMEARGRAPH_MAX_EVENTS", "50000"))


def _should_trace(filename):
    if not filename:
        return True
    if filename.startswith("<"):
        return True
    if "site-packages" in filename or "lib/python" in filename:
        return False
    if "smeargraph" in filename:
        return False
    if TRACE_MODULE_FILTER and TRACE_MODULE_FILTER not in filename:
        return False
    return True


def _trace_callback(frame, event, arg):
    global _trace_depth, _event_count
    if _event_count >= _MAX_EVENTS:
        return None
    if _trace_depth >= TRACE_DEPTH:
        return None

    filename = frame.f_code.co_filename
    if not _should_trace(filename):
        return _trace_callback

    func_name = frame.f_code.co_name
    if func_name.startswith("__") and func_name != "__init__":
        return _trace_callback

    ts = time.time()

    if event == "call":
        _trace_depth += 1
        _event_count += 1
        args = {}
        for k, v in frame.f_locals.items():
            if k == "self":
                try:
                    args["self"] = type(v).__name__
                except Exception:
                    args["self"] = "?"
            elif not k.startswith("_"):
                try:
                    if isinstance(v, (str, int, float, bool, type(None))):
                        args[k] = v
                    elif isinstance(v, (list, tuple)) and len(v) <= 3:
                        args[k] = str(type(v).__name__) + "[" + str(len(v)) + "]"
                    elif isinstance(v, dict):
                        args[k] = "dict[" + str(len(v)) + "]"
                    else:
                        args[k] = type(v).__name__
                except Exception:
                    args[k] = "?"

        _write_event({
            "event": "call",
            "function": func_name,
            "file": filename,
            "line": frame.f_lineno,
            "args": args,
            "depth": _trace_depth,
            "timestamp": ts,
        })

    elif event == "return":
        _event_count += 1
        ret_val = None
        try:
            if arg is not None:
                ret_val = type(arg).__name__
        except Exception:
            ret_val = "?"
        _write_event({
            "event": "return",
            "function": func_name,
            "file": filename,
            "return": ret_val,
            "depth": _trace_depth,
            "timestamp": ts,
        })
        _trace_depth = max(0, _trace_depth - 1)

    return _trace_callback


def _write_event(evt):
    global _trace_file
    if _trace_file is None:
        Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
        _trace_file = open(OUTPUT_FILE, "a")
    _trace_file.write(json.dumps(evt, ensure_ascii=False) + "\n")


import atexit

def _flush():
    global _trace_file
    if _trace_file:
        _trace_file.flush()
        _trace_file.close()
        _trace_file = None

atexit.register(_flush)


def _install():
    if sys.version_info >= (3, 12):
        try:
            sys.monitoring.use_tool_id(sys.monitoring.DEBUGGER_ID, "smeargraph")
            sys.monitoring.set_events(
                sys.monitoring.DEBUGGER_ID,
                sys.monitoring.events.PY_START | sys.monitoring.events.PY_RETURN,
            )
            sys.monitoring.register_callback(
                sys.monitoring.DEBUGGER_ID,
                sys.monitoring.events.PY_START,
                _monitoring_callback,
            )
            return
        except Exception:
            pass
    sys.settrace(_trace_callback)


if sys.version_info >= (3, 12):

    def _monitoring_callback(code, offset, event, arg):
        global _event_count, _trace_depth
        if _event_count >= _MAX_EVENTS:
            return sys.monitoring.DISABLE
        if not _should_trace(code.co_filename):
            return sys.monitoring.DISABLE

        ts = time.time()
        if event == sys.monitoring.events.PY_START:
            _trace_depth += 1
            _event_count += 1
            _write_event({
                "event": "call",
                "function": code.co_name,
                "file": code.co_filename,
                "line": code.co_firstlineno,
                "args": {},
                "depth": _trace_depth,
                "timestamp": ts,
            })
        elif event == sys.monitoring.events.PY_RETURN:
            _event_count += 1
            _write_event({
                "event": "return",
                "function": code.co_name,
                "file": code.co_filename,
                "return": type(arg).__name__ if arg is not None else None,
                "depth": _trace_depth,
                "timestamp": ts,
            })
            _trace_depth = max(0, _trace_depth - 1)


_install()
