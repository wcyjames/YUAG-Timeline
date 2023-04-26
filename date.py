import re
from datetime import datetime
'''
Date parser to parse different forms of date strings into numeric years.
The dates stored in the database comes in many different forms. Some notable examples are:

- 2016
- 323 B.C.–A.D. 256
- ca. 323 B.C.–A.D. 256
- Late 5th century B.C.
- 1306–31
- mid-20th century
- 1960s

Here is how these date strings are handled:
Since many dates contain a start date and an end date that's separated with a '–', we split the string by '–'.
we then go through the separated list and find the first two chunks which contain numeric numbers. Those will
be the strings for our start and end date.
Then, we examine these strings. For each of them, we will split by whitespace and look at each individual word in 
the list. We are looking for numeric strings, since they indicate dates. Sometimes this numeric string is a year
(like '2016'), in this case the string itself would be the result. If the word 'B.C.' appeared in the same string,
however, it means that this string represents a BCE date, and we multiply the final result by -1. 
If the suffix 'st', 'nd', 'rd' or 'th' appeared after a number (like '19th'), we know that this represents a century.
What we do in this case is we strip off the suffix, subtract 1 from the number, then multiply it by 100. This gives us
the starting year of the century, which is a rough approximation.
If the suffix 's' appeared after a number (like '1960s'), we simply strip off the 's'.
Sometimes when both a start date and an end date are present, the dates are written in forms like '1306-31', where the 
end date isn't fully given. In this case, we check if the end date is smaller than the start date (which normally shouldn't
be true), and if that's the case, we would append the end date to the beginning of the start date (in this specific case, 
we append 31 to 13 and get 1331 for our end date). 
Our results for the date strings above would be:
- ('2016', None)
- ('-323', '256')
- ('-323', '256')
- ('-400', None)
- ('1306', '1331')
- ('1900', None)
- ('1960', None)

'''


def parseDate(date):
    # e.g. 1913-14;Schwarz Edition, 1964
    if ';' in date:
        idx = date.find(';')
        date = date[:idx]
    # e.g. 5/17/88
    # elif '/' in date:
    #     date_obj = datetime.strptime(date, '%m/%d/%y')
    #     date = date_obj.strftime('%Y')  
    elif ',' in date:
        idx = date.find(',')
        date = date[:idx]
    date = date.replace('\u2013', '-').split('-')
    start = None
    end = None
    for i in date:
        if has_numbers(i):
            if start is None:
                start = i
            elif end is None:
                end = i
    start_year = parseIndividualDate(start)
    end_year = parseIndividualDate(end)

    if end_year is not None:
        if int(end_year) < 0 and int(start_year) > 0:
            start_year = str(int(start_year) * -1)
        if int(end_year) < int(start_year) and len(end_year) < len(start_year):
            temp = start_year
            len_end_year = len(end_year)
            temp = temp[:-len_end_year]
            end_year = temp + end_year
    return (start_year, end_year)

def parseIndividualDate(date):
    if date is None:
        return None
    date_list = date.split(' ')
    is_bce = -1
    year = 0
    for i in date_list:
        if i == 'B.C.':
            is_bce = 1
        if i == 'A.D.':
            is_bce = -1
        if i.isnumeric():
            year = i
        century = re.findall("[0-9]+th", i) + re.findall("[0-9]+nd", i) + re.findall("[0-9]+rd", i) + re.findall("[0-9]+st", i)
        if len(century) > 0:
            year = str((int(century[0][:-2]) - 1) * 100)
        year_s = re.findall("[0-9]+s", i)
        if len(year_s) > 0:
            year = year_s[0][:-1]
    return str(int(year) * (-is_bce))

def has_numbers(inputString):
    return bool(re.search(r'\d', inputString))


# f = open("date.txt", 'rb')
# lines = f.readlines()
# for l in lines:
#     print(parseDate(l.decode('utf8').strip()))
# print(parseDate("1970s"))

# For testing:

def _test():
    date = '1974,05'
    print(parseDate(date))

if __name__ == '__main__':
    _test()