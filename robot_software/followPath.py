#! /usr/bin/env python3
import ev3dev.ev3 as ev3
from followLine import FollowLine
from threading import Thread


class FollowPath:
    # Follow a path given by the server

    # Constructor
    def __init__(self):
        self.shut_down = False
        self.runner = None

    def go(self, path):
        line_follower = FollowLine()
        for direction, distance in path:
            if line_follower.set_cs_modes(direction):
                # modes set successfully
                # direction move in forwards axis or side axis
                if direction == 'forward':
                    line_follower.run_forward(distance)
                elif direction == 'backward':
                    line_follower.run_backward(distance)
                elif direction == 'left':
                    line_follower.run_sideways(distance, False)
                elif direction == 'right':
                    line_follower.run_sideways(distance, True)
            else:
                # not a valid direction for colour sensors
                if direction == 'G':
                    ev3.Sound.speak("Scoopdidoop").wait()
                else:
                    ev3.Sound.speak("Wrong command given. What does", direction, "mean?").wait()
        line_follower.stop()

    # TODO: possibly move start and stop to FollowPath or move correct trajectory to a separate file instead
    def start(self, path):
        self.shut_down = False
        if len(path) == 0:
            ev3.Sound.speak("No instructions given").wait()
        else:
            self.runner = Thread(target=self.go, args=(path,), name='go')
            self.runner.start()


# Main function
if __name__ == "__main__":
    path_follower = FollowPath()
    #current_path = [('left', 1), ('forward', 2), ('backward', 2), ('left',2), ('forward', 4), ('right', 2), ('backward', 4), ('right', 1)]
    current_path = [('backward', 3)]
    path_follower.start(current_path)
