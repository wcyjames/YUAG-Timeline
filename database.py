#!/usr/bin/env python

from sqlite3 import connect
from contextlib import closing
from utils import get_db
import requests
import json
import collections
from date import parseDate

#-----------------------------------------------------------------------

# DATABASE_URL = 'file:database/1680139756.0?mode=ro'
DATABASE_URL = 'file:database/lux.sqlite?mode=ro'

# modified a1_lux.py
def get_filter_terms(args):
    """Get query filter terms from argparse.
    """
    _filters = ''
    _fields = {}
    i = 0
    # filter
    if len(args) > 1:
        _filters += 'WHERE '
        # if args[3]:
        i_d = 0
        if isinstance(args[3], str):
            d = args[3]
            _fields['d'] = f'%{d}%'
            _filters += 'AND ' if i > 0 else ''
            _filters += "UPPER(dept_names) LIKE UPPER(:d) "
            i += 1
        else: 
            if len(args[3]) > 1:
                _filters += '('
                _filters += 'AND ' if i > 0 else '' 
                for d in args[3]:
                    # print(d)
                    field = 'd' + str(i_d)
                    _fields[field] = f'%{d}%'
                    _filters += 'OR ' if i_d > 0 else '' 
                    _filters += f"UPPER(dept_names) LIKE UPPER(:{field}) "
                    i_d+=1
                i+= 1
                _filters += ') '
            else:
                if len(args[3]) == 0:
                    d = ''
                else:
                    _filters += '('
                    d = args[3][0]
                    _fields['d'] = f'%{d}%'
                    _filters += 'AND ' if i > 0 else ''
                    _filters += "UPPER(dept_names) LIKE UPPER(:d) "
                    i += 1
                    _filters += ') '
        # _fields['d'] = f'%{args[3]}%'
        # _filters += 'AND ' if i > 0 else ''
        # _filters += "UPPER(dept_names) LIKE UPPER(:d) "
        # i += 1
        # if args[2]:
        _fields['a'] = f'%{args[2]}%'
        _filters += 'AND ' if i > 0 else ''
        _filters += "UPPER(agt_names) LIKE UPPER(:a) "
        i += 1
        # if args[1]:
        _fields['c'] = f'%{args[1]}%'
        _filters += 'AND ' if i > 0 else ''
        _filters += "UPPER(cls_names) LIKE UPPER(:c) "
        i += 1
        # if args[0]:
        _fields['l'] = f'%{args[0]}%'
        _filters += 'AND ' if i > 0 else ''
        _filters += "UPPER(label) LIKE UPPER(:l) "
        i += 1
        # if args[4]:
        _fields['g'] = f'%{args[4]}%'
        _filters += 'AND ' if i > 0 else ''
        _filters += "(UPPER(label) LIKE UPPER(:g) OR UPPER(agt_names) LIKE UPPER(:g)) "
        i += 1
    return _filters, _fields

def get_filtered_objects(_filters, _fields):
    """Get filtered objects from queries.
    """
    with connect(DATABASE_URL, isolation_level=None,
        uri=True) as connection:

        with closing(connection.cursor()) as cursor:
            # query for agents
            agt_query = "SELECT id, acs, label, GROUP_CONCAT(agt_name, '|') as agt_names, "
            agt_query += "GROUP_CONCAT(part, '|') as parts, date FROM ( "
            agt_query += "SELECT objects.id, objects.label, objects.accession_no as acs, agents.name as agt_name, "
            agt_query += "productions.part, objects.date "
            agt_query += "FROM (objects LEFT OUTER JOIN productions "
            agt_query += "ON productions.obj_id = objects.id) "
            agt_query += "LEFT OUTER JOIN agents ON productions.agt_id = agents.id "
            agt_query += "ORDER by agents.name ASC, productions.part ASC "
            agt_query += ") "
            agt_query += "GROUP BY id "
            # query for departments
            dept_query = "SELECT id, GROUP_CONCAT(name, '|') as dept_names FROM ( "
            dept_query += "SELECT objects.id, departments.name "
            dept_query += "FROM (objects LEFT OUTER JOIN objects_departments "
            dept_query += "ON objects_departments.obj_id = objects.id) "
            dept_query += "LEFT OUTER JOIN departments ON "
            dept_query += "objects_departments.dep_id = departments.id "
            dept_query += ") "
            dept_query += "GROUP BY id "
            # query for classifiers
            cls_query = "SELECT id, GROUP_CONCAT(name, ',') as cls_names FROM ( "
            cls_query += "SELECT objects.id, classifiers.name "
            cls_query += "FROM (objects LEFT OUTER JOIN objects_classifiers "
            cls_query += "ON objects_classifiers.obj_id = objects.id) "
            cls_query += "LEFT OUTER JOIN classifiers "
            cls_query += "ON objects_classifiers.cls_id = classifiers.id "
            cls_query += "ORDER by classifiers.name "
            cls_query += ") "
            cls_query += "GROUP BY id "

            query = "SELECT id, label, agt_names, parts, date, dept_names, cls_names FROM ( "
            query += agt_query
            query += ") q1 "
            query += " NATURAL JOIN ("
            query += dept_query
            query += ") q2 "
            query += " NATURAL JOIN ("
            query += cls_query
            query += ") q3 "
            # apply the filters
            query += _filters
            query += "ORDER BY RANDOM() "
            # limit to output 50 objects
            query += 'LIMIT 50 '
            obj_list = []
            cursor.execute(query, _fields)
            row = cursor.fetchone()

            while row is not None:
                _id = str(row[0])
                label = str(row[1])
                agents_list = str(row[2]).split('|')
                parts_list = str(row[3]).split('|')
                agt_part_list = []
                for name, part in zip(agents_list, parts_list):
                    agt_part_list.append(f"{name} ({part})")
                agt_part_str = ';'.join(agt_part_list)
                date = str(row[4])
                depts = str(row[5])
                clses = sorted(str(row[6]).lower().split(','))
                clses_sorted = ''
                counter = 0
                for cls in clses:
                    if counter != 0:
                        clses_sorted += (f",{cls}")
                    else:
                        clses_sorted += (str(cls))
                    counter += 1
                obj = [_id, label, date, depts, agt_part_str, clses_sorted]
                obj_list.append(obj)
                row = cursor.fetchone()
            return obj_list

def get_filtered_objects2(_filters, _fields, num_result):
    """Get filtered objects from queries.
    """
    if num_result.isnumeric():
        _fields['n'] = num_result
    else:
        _fields['n'] = 50
    with connect(DATABASE_URL, isolation_level=None,
        uri=True) as connection:

        with closing(connection.cursor()) as cursor:
            # query for agents
            agt_query = "SELECT id, acs, label, GROUP_CONCAT(agt_name, '|') as agt_names, "
            agt_query += "GROUP_CONCAT(part, '|') as parts, date FROM ( "
            agt_query += "SELECT objects.id, objects.label, objects.accession_no as acs, agents.name as agt_name, "
            agt_query += "productions.part, objects.date "
            agt_query += "FROM (objects LEFT OUTER JOIN productions "
            agt_query += "ON productions.obj_id = objects.id) "
            agt_query += "LEFT OUTER JOIN agents ON productions.agt_id = agents.id "
            agt_query += "ORDER by agents.name ASC, productions.part ASC "
            agt_query += ") "
            agt_query += "GROUP BY id "
            # query for departments
            dept_query = "SELECT id, GROUP_CONCAT(name, '|') as dept_names FROM ( "
            dept_query += "SELECT objects.id, departments.name "
            dept_query += "FROM (objects LEFT OUTER JOIN objects_departments "
            dept_query += "ON objects_departments.obj_id = objects.id) "
            dept_query += "LEFT OUTER JOIN departments ON "
            dept_query += "objects_departments.dep_id = departments.id "
            dept_query += ") "
            dept_query += "GROUP BY id "
            # query for classifiers
            cls_query = "SELECT id, GROUP_CONCAT(name, ',') as cls_names FROM ( "
            cls_query += "SELECT objects.id, classifiers.name "
            cls_query += "FROM (objects LEFT OUTER JOIN objects_classifiers "
            cls_query += "ON objects_classifiers.obj_id = objects.id) "
            cls_query += "LEFT OUTER JOIN classifiers "
            cls_query += "ON objects_classifiers.cls_id = classifiers.id "
            cls_query += "ORDER by classifiers.name "
            cls_query += ") "
            cls_query += "GROUP BY id "

            query = "SELECT id, label, agt_names, parts, date, dept_names, cls_names, acs FROM ( "
            query += agt_query
            query += ") q1 "
            query += " NATURAL JOIN ("
            query += dept_query
            query += ") q2 "
            query += " NATURAL JOIN ("
            query += cls_query
            query += ") q3 "
            # apply the filters
            query += _filters
            query += "ORDER BY RANDOM() "
            # limit to output n objects
            query += 'LIMIT :n '
            cursor.execute(query, _fields)
            rows = cursor.fetchall()

            id_list = []
            json_list = collections.OrderedDict()
            events = []

            for row in rows: 
                event = collections.OrderedDict()
                start_date = collections.OrderedDict()
                end_date = collections.OrderedDict()
                text = collections.OrderedDict()
                media = collections.OrderedDict()

                agents_list = str(row[2]).split('|')
                parts_list = str(row[3]).split('|')
                agt_part_list = []
                for name, part in zip(agents_list, parts_list):
                    agt_part_list.append(f"{name} ({part})")
                agt_part_str = ', '.join(agt_part_list)

                cls = str(row[6]).split(',')
                new_cls = ', '.join(cls)

                details = ''
                details += '<p><b>Agents - </b>' + agt_part_str + '</p>\n'
                details += '<p><b>Date of Creation - </b>' + str(row[4]) + '</p>\n'
                details += '<p><b>Department(s) - </b>' + str(row[5]) + '</p>\n'
                details += '<p><b>Classification - </b>' + new_cls + '</p>\n'
                details += '<p><b>Accession Number - </b>' + str(row[7]) + '</p>\n'

                event['unique_id'] = str(row[0])

                text['headline'] = str(row[1]).replace('\u2013', '-')
                text['text'] = details
                date = str(row[4]).replace('\u2013', '-')

                image_url = f"https://media.collections.yale.edu/thumbnail/yuag/obj/{str(row[0])}"
                # r = requests.head(image_url)
                # ok_codes = [301, 302, 303, 307, 308, 200]
                # if int(r.status_code) in ok_codes:
                media_link = image_url
                # else:
                #   media_link = "https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png"
                media['url'] = media_link

                start_year, end_year = parseDate(date)
                start_date['year'] = start_year
                end_date['year'] = end_year

                event['start_date'] = start_date
                if end_year is not None:
                    event['end_date'] = end_date
                event['text'] = text
                event['media'] = media
                if start_year is not None:
                    id_list.append(str(row[0]))
                    events.append(event)
                # print(event)
            # print(events)
            json_list['events'] = events
            return id_list, json_list

def search(label, classifier, agent, department):
    _filters, _fields = get_filter_terms([label, classifier, agent, department])
    _objects = get_filtered_objects(_filters, _fields)
    return _objects

def search2(label, classifier, agent, department, agent_or_label, num_result):
    print(f"{label}, {classifier}, {agent}, {department}, {agent_or_label}")
    _filters, _fields = get_filter_terms([label, classifier, agent, department, agent_or_label])
    id_list, json_list = get_filtered_objects2(_filters, _fields, num_result)
    coord_list = search3(id_list)
    # print(coord_list)
    return json_list, coord_list

def search3(id_list):
    results = collections.OrderedDict()
    counter = 0
    with connect(DATABASE_URL, isolation_level=None,
        uri=True) as connection:

        with closing(connection.cursor()) as cursor:
            for id in id_list:
                _fields = {}
                _fields['id'] = id
                query = "SELECT places.latitude, places.longitude FROM (objects LEFT OUTER JOIN objects_places "
                query += "ON objects.id = objects_places.obj_id) JOIN places ON objects_places.pl_id = places.id "
                query += "WHERE objects.id = :id;"

                cursor.execute(query, _fields)
                rows = cursor.fetchall()
                
                if len(rows) == 0:
                    results[id] = (("0", "0"))
                    counter += 1
                else:
                    for row in rows:
                        results[id] = ((f"{str(row[0])}", f"{str(row[1])}"))
                        counter += 1

    # print(results)
    return results
#-----------------------------------------------------------------------

# For testing:

def _test():
    objs = search2('', '', '', ['African Art Collection, Yale University Art Gallery', 'Asian Art Collection, Yale University Art Gallery'], '', '40')
    # print(objs)

if __name__ == '__main__':
    _test()
