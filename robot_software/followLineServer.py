#! /usr/bin/env python3
import ev3dev.ev3 as ev3
import logging
from time import sleep, time
from threading import Thread
import detectMarking
import control


class FollowLine:
    # From https://gist.github.com/CS2098/ecb3a078ed502c6a7d6e8d17dc095b48
    MOTOR_SPEED = 700
    KP = 10
    KD = 0.5  # derivative gain   medium
    KI = 0  # integral gain       lowest
    DT = 50  # milliseconds  -  represents change in time since last sensor reading/

    MARKING_NUMBER = 2  # number of consecutive colour readings to detect marking
    MARKING_INTERVAL = 1  # time between marking checks in seconds

    # Constructor
    def __init__(self):
        self.btn = ev3.Button()
        self.shut_down = False

        # colour sensors
        self.csfl = ev3.ColorSensor('in1')  # colour sensor front left
        self.csfr = ev3.ColorSensor('in2')  # colour sensor front right
        self.csbl = ev3.ColorSensor('in3')  # colour sensor back left
        self.csbr = ev3.ColorSensor('in4')  # colour sensor back right
        assert self.csfl.connected
        assert self.csfr.connected
        assert self.csbl.connected
        assert self.csbr.connected
        self.csfl.mode = 'COL-REFLECT'  # measure light intensity
        self.csfr.mode = 'COL-REFLECT'  # measure light intensity
        self.csbl.mode = 'COL-COLOR'  # measure colour
        self.csbr.mode = 'COL-COLOR'
        # motors
        self.lm = ev3.LargeMotor('outA')  # left motor
        self.rm = ev3.LargeMotor('outC')  # right motor
        self.cm = ev3.LargeMotor('outD')  # centre motor
        assert self.lm.connected
        assert self.rm.connected
        assert self.cm.connected

        self.consecutive_colours = 0  # counter for consecutive colour readings
        #self.number_of_markers = 0  # at which marker it should stop
        self.runner = None

    def detect_marking(self, colour):
        if colour == 3 or colour == 2:  # 3 = green 2 = blue
            self.consecutive_colours += 1
            # print("CONSECUTIVE COLOURS: ", self.consecutive_colours)
            if self.consecutive_colours > self.MARKING_NUMBER:
                return colour
        else:
            self.consecutive_colours = 0
        return -1

    # limit motor speed to safe values: [-1000, 1000] deg/sec
    def limit_speed(self, speed):
        if speed > 1000:
            return 1000
        if speed < -1000:
            return -1000
        return speed

    def correct_trajectory(self, number_of_markers, reverse):
        integral = 0
        previous_error = 0
        marker_counter = 0
        start_time = time()

        # Assign sensors to act as front or back
        while not self.shut_down:
            if reverse:
                self.csfl.mode = 'COL-COLOR'  # measure colour
                self.csfr.mode = 'COL-COLOR'  # measure colour
                self.csbl.mode = 'COL-REFLECT'  # measure light intensity
                self.csbr.mode = 'COL-REFLECT'  # measure light intensity
                lval = self.csbr.value()  # back right becomes front left
                rval = self.csbl.value()
            else:
                self.csfl.mode = 'COL-REFLECT'  # measure light intensity
                self.csfr.mode = 'COL-REFLECT'  # measure light intensity
                self.csbl.mode = 'COL-COLOR'  # measure colour
                self.csbr.mode = 'COL-COLOR'
                lval = self.csfl.value()
                rval = self.csfr.value()

            # Calculate torque using PID control
            u, integral, previous_error = control.calculate_torque\
                (lval, rval, self.DT, integral, previous_error)
            # Set the speed of the motors
            speed_left = self.limit_speed(self.MOTOR_SPEED + u)
            speed_right = self.limit_speed(self.MOTOR_SPEED - u)

            # run motors
            if reverse:
                self.lm.run_timed(time_sp=self.DT, speed_sp=speed_right)
                self.rm.run_timed(time_sp=self.DT, speed_sp=speed_left)
            else:
                self.lm.run_timed(time_sp=self.DT, speed_sp=-speed_left)
                self.rm.run_timed(time_sp=self.DT, speed_sp=-speed_right)
            sleep(self.DT / 1000)

            # print("u {}".format(u))
            # print("lm {}\n".format(lm.speed_sp))
            # print("rm {}".format(rm.speed_sp))
            # print("PID:", lval, rval)

            # Check markers
            if time() - start_time > self.MARKING_INTERVAL:
                if reverse:
                    current_colour = self.csfl.value()
                else:
                    current_colour = self.csbl.value()

                # returns 3 if green, 2 if blue
                marker_colour = self.detect_marking(current_colour)
                if marker_colour == 3:
                    # stop after given number of greens
                    marker_counter += 1
                    ev3.Sound.beep()
                    start_time = time()
                    if marker_counter >= number_of_markers:
                        # self.stop()
                        return
                elif marker_colour == 2:
                    # stop on blue marker
                    # self.stop()
                    # self.reverse = not self.reverse
                    return

    def move_sideways(self, cm):
        while not self.shut_down:
            cm.run_timed(time_sp=self.DT, speed_sp=300)

    # move fowards/backwards
    def run_y(self, distance):
        if distance > 0:
            reverse = False
            number_of_markers = distance
        else:
            reverse = True
            number_of_markers = distance * -1
        self.correct_trajectory(number_of_markers, reverse)

    def stop(self):
        self.shut_down = True
        self.rm.stop()
        self.lm.stop()
        ev3.Sound.speak("bruh").wait()


# Main function
if __name__ == "__main__":
    robot = FollowLine()
    robot.start(2)
