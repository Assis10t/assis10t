import socket


def listen():
    PORT = 65432 # Port to listen on (non-privileged ports are > 1023)

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM) 
    HOST  = socket.gethostbyname(socket.gethostname())
    s.bind((HOST, PORT))
    print("Listening on {}:{}".format(HOST,PORT))
    while True:
        s.listen(1)
        conn, addr = s.accept()

        print('Connected by', addr)
        
        data = conn.recv(1024)
        if data:
            conn.sendall(b'done')
        conn.close()
listen()