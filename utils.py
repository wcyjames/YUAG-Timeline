from flask import Flask, g, render_template, request, json, redirect, session
import json
import collections
import sqlite3
from date import parseDate

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect('database/lux.sqlite')
    return db

def to_json(rows):
    json_list = collections.OrderedDict()
    events = []
    if rows is not None:
        for row in rows:
            print(row)
            event = collections.OrderedDict()
            start_date = collections.OrderedDict()
            end_date = collections.OrderedDict()
            text = collections.OrderedDict()
            media = collections.OrderedDict()

            event['unique_id'] = str(row[0])

            text['headline'] = str(row[1]).replace('\u2013', '-')
            date = str(row[3]).replace('\u2013', '-')

            start_year, end_year = parseDate(date)
                                
            start_date['year'] = start_year
            end_date['year'] = end_year

            media_link = str(row[4])
            if media_link != '':
                media['url'] = str(row[4])
            else:
                media['url'] = 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png'

            event['start_date'] = start_date
            if end_year is not None:
                event['end_date'] = end_date
            event['text'] = text
            event['media'] = media
            if start_year is not None:
                events.append(event)
    json_list['events'] = events

    return json_list