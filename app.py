from flask import Flask, json, request
import logging
import git

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

@app.route('/update_server', methods=['POST'])
def webhook():
    if request.method == 'POST':
        try:
            repo = git.Repo("chat")
            origin = repo.remotes.origin
            origin.pull()
            return 'Updated PythonAnywhere successfully', 200
        except Exception as e:
            logging.error(f"Error during pull: {str(e)}")
            return 'Update failed', 500
    return 'Method not allowed', 405

@app.route('/')
def hello_world():
    return 'Hello from Flask!1'