import json
from IPython.display import display, HTML
from flask_cors import CORS, cross_origin
import dis_into_json
import os
from flask import Flask, request
import threading
import logging
import ulid

##############################################################################
# jupyter notebook tricks

def quiet_script(cmd):
    script = "<script>%s</script>" % cmd
    t = ulid.ulid()
    self_destruct_locator = "<span id='%s'></span>" % t
    self_destruct_script = "<script>document.getElementById('%s').parentNode.parentNode.remove();</script>" % t
    display(HTML("\n".join([script, self_destruct_locator, self_destruct_script])))

##############################################################################
# Routes/Flask

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
session_ulid = ulid.ulid()
quiet_script(open("jspy.js").read())
quiet_script("JSPy.session_ulid = %s;\n" % json.dumps(session_ulid))

app = Flask("jspy")

@app.route('/return', methods=['POST'])
@cross_origin(["127.0.0.1:8888", "localhost:8888"])
def process_return():
    j = request.get_json()
    post_return(j)
    return "ok"

@app.route('/secret', methods=['POST'])
@cross_origin(["127.0.0.1:8888", "localhost:8888"])
def secret():
    return session_ulid
    
def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()

def start_flask():
    def run_it():
        app.run(port=8889, host='127.0.0.1')
        
    flask_thread = threading.Thread(target=run_it)
    flask_thread.start()
    return flask_thread

flask_thread = None

def init():
    global flask_thread
    flask_thread = start_flask()

def shutdown():
    shutdown_server()

init()

##############################################################################
# IPC

return_cv = threading.Condition()
the_value = None
def post_return(val):
    global the_value
    return_cv.acquire()
    the_value = val
    return_cv.notify()
    return_cv.release()

def get_return():
    global the_value
    return_cv.acquire()
    return_cv.wait()
    my_val = the_value
    the_value = None
    return_cv.release()
    return my_val

##############################################################################
# Marshalling

def to_param(p):
    if type(p) == type(to_param): # function
        f = dis_into_json.function_as_json(p)
        return "(JSPy.makePythonFunction(%s))" % json.dumps(f)
    else:
        return json.dumps(p)
    
##############################################################################
# py side methods

def js_call(fun_name, *args):
    cmd = "(function() { try { JSPy.returnResult(%s(%s)); } catch(e) { JSPy.returnResult('EXCEPTION'); } })()" % (fun_name, ",".join(to_param(p) for p in args))
    quiet_script(cmd)
    return get_return()

def js_fun(fun_name):
    def the_fun(*args):
        return js_call(fun_name, *args)
    return the_fun
