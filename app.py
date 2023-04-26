from flask import Flask, g, render_template, request, json, redirect, session, jsonify, make_response
import json
import collections
import sqlite3
from date import parseDate
from database import search2

app = Flask(__name__)

@app.route('/')
def main():
    return render_template('main.html')

@app.route('/test', methods=['POST', 'GET'])
def test():
    json_list, coord_list = search2('', '', '', '', '', '50')
    coord_list = json.dumps(coord_list)
    j = json.dumps(json_list)
    # with open("./json/result.json", "w+") as f:
    #     f.write(j)
    return render_template('timeline.html', data = j, coord = coord_list)

@app.route('/fetchdb', methods=['GET'])
def fetch_from_db():
    label = request.args.get('l', '')
    classifier = request.args.get('c', '')
    agent = request.args.get('a', '')
    num_results = request.args.get('n', '')
    department = request.args.getlist('d')
    agent_or_label = request.args.get('g', '')
    json_list, coord_list = search2(label, classifier, agent, department, agent_or_label, num_results)
    # json_list = json.dumps(json_list)
    # json_list = json.load(json_list)
    # coord_list = json.dumps(coord_list)
    # coord_list = json.load(coord_list)
    result = collections.OrderedDict()
    result['json'] = json_list
    result['coord'] = coord_list
    result = json.dumps(result)
    response = make_response(result)
    return response