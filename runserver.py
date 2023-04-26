"run an instance of the Flask test server on the specified port"

import argparse
import sys
from app import app


def main(args):
    """Main function to run the flask server.
    """
    try:
        port = int(args.port)
    except Exception:
        print('Port must be an integer.', file=sys.stderr)
        sys.exit(1)

    try:
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as ex:
        print(ex, file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='The YUAG search application', allow_abbrev=False)
    parser.add_argument('port', type=str,
    help = 'the port at which the server should listen', metavar='port')
    arguments = parser.parse_args()
    main(arguments)
