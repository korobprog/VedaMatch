
import psycopg2
import sys

def check_connection(password):
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5435,
            user="raguser",
            password=password,
            dbname="ragdb"
        )
        conn.close()
        return True
    except Exception as e:
        return False

if __name__ == "__main__":
    if check_connection("ragpassword"):
        print("ragpassword")
    elif check_connection("krishna1284radha"):
        print("krishna1284radha")
    else:
        print("FAIL")
