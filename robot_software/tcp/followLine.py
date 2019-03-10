#! /usr/bin/env python3
import ev3dev.ev3 as ev3
import logging
from time import sleep, time
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
    REVERSE = False

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

        self.blue = 2
        self.green = 3

        self.consecutive_colours = 0  # counter for consecutive colour readings
        self.ignore_blue = False  # when switching from sideways to forwards
        self.ignore_green = False  # when switching from fowards to sideways
        #self.number_of_markers = 0  # at which marker it should stop

    def detect_marking(self, colour_left, colour_right):
        if (colour_right == 3 and colour_left == 3) or (colour_right == 2 and colour_left == 2):  # 3 = green 2 = blue
            self.consecutive_colours += 1
            # print("CONSECUTIVE COLOURS: ", self.consecutive_colours)
            if self.consecutive_colours > self.MARKING_NUMBER:
                return colour_right
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
        time_off_line = 0
        self.ignore_green = True

        if reverse:
            self.csfl.mode = 'COL-COLOR'  # measure colour
            self.csfr.mode = 'COL-COLOR'  # measure colour
            self.csbl.mode = 'COL-REFLECT'  # measure light intensity
            self.csbr.mode = 'COL-REFLECT'  # measure light intensity
        else:
            self.csfl.mode = 'COL-REFLECT'  # measure light intensity
            self.csfr.mode = 'COL-REFLECT'  # measure light intensity
            self.csbl.mode = 'COL-COLOR'  # measure colour
            self.csbr.mode = 'COL-COLOR'

        # Assign sensors to act as front or back
        while not self.shut_down:
            if reverse:
                lval = self.csbr.value()  # back right becomes front left
                rval = self.csbl.value()
            else:
                lval = self.csfl.value()
                rval = self.csfr.value()

            # most likely off line, may need to recalibrate numbers later
            time_off_line = self.get_back_on_line(lval, rval, time_off_line)

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
            # Wait before checking for colour again
            if time() - start_time > self.MARKING_INTERVAL:
                if reverse:
                    colour_left = self.csfr.value()
                    colour_right = self.csfl.value()
                else:
                    colour_left = self.csbl.value()
                    colour_right = self.csbr.value()

                # returns 3 if green, 2 if blue
                marker_colour = self.detect_marking(colour_left, colour_right)
                if marker_colour == self.green:
                    # stop after given number of greens
                    self.ignore_blue = False
                    marker_counter += 1
                    ev3.Sound.beep()
                    start_time = time()
                    if marker_counter >= number_of_markers:
                        # self.stop()
                        return
                elif marker_colour == self.blue and not self.ignore_blue:
                    # stop on blue marker
                    # self.stop()
                    # self.reverse = not self.reverse
                    return

    def run_sideways(self, distance, reverse):
        self.ignore_blue = False

        # If previous instruction was forwards or backwards
        # keep moving until a blue line is seen
        if self.ignore_green:
            self.correct_trajectory(99, self.REVERSE)

        self.ignore_green = False

        if reverse:
            self.csfl.mode = 'COL-COLOR'  # measure light intensity
            self.csfr.mode = 'COL-REFLECT'  # measure colour
            self.csbl.mode = 'COL-COLOR'  # measure light intensity
            self.csbr.mode = 'COL-REFLECT'  # measure colour
        else:
            self.csfl.mode = 'COL-REFLECT'  # measure light intensity
            self.csfr.mode = 'COL-COLOR'  # measure colour
            self.csbl.mode = 'COL-REFLECT'  # measure light intensity
            self.csbr.mode = 'COL-COLOR'  # measure colour

        marker_counter = 0
        start_time = time()
        while not self.shut_down:
            if reverse:
                self.cm.run_timed(time_sp=self.DT/2, speed_sp=-500)
            else:
                self.cm.run_timed(time_sp=self.DT/2, speed_sp=500)
            sleep(self.DT / 2000)

            if time() - start_time > self.MARKING_INTERVAL:
                if reverse:
                    colour_left = self.csfl.value()
                    colour_right = self.csbl.value()
                else:
                    colour_left = self.csbr.value()
                    colour_right = self.csfr.value()


                # returns 3 if green, 2 if blue
                marker_colour = self.detect_marking(colour_left, colour_right)
                if marker_colour == self.blue:
                    # stop after given number of blues
                    marker_counter += 1
                    ev3.Sound.beep()
                    start_time = time()
                    if marker_counter >= distance:
                        # self.stop()
                        self.ignore_blue = True
                        return
                elif marker_colour == self.green:
                    # stop on green marker
                    # self.stop()
                    # self.reverse = not self.reverse
                    return

    # move forwards/backwards
    def run_forwards(self, distance, reverse):
        self.REVERSE = reverse
        self.correct_trajectory(distance, reverse)

    # when line is lost oscillate side to side until it is found
    def get_back_on_line(self, lval, rval, time_off_line):
        if lval > 90 and rval > 70:
            if time_off_line == 0:
                time_off_line = time()
            # if off line for more than a second move side-to-side until line is found
            print(time() - time_off_line)
            if time() - time_off_line > 0.5:
                correction_speed = 200
                correction_time = 100
                # can change thresholds
                while lval > 70 and rval > 50:
                    self.cm.run_timed(time_sp=correction_time, speed_sp=correction_speed)
                    correction_speed *= -1
                    # increase the time to move in one direction to increased the search radius
                    correction_time += 100
                    sleep(correction_time / 1000)  # milliseconds to seconds
                    lval = self.csfl.value()
                    rval = self.csfr.value()
                time_off_line = 0
        else:
            time_off_line = 0
        return time_off_line

    def stop(self):
        self.shut_down = True
        self.rm.stop()
        self.lm.stop()
        ev3.Sound.speak("bruh").wait()


# Main function
if __name__ == "__main__":
    robot = FollowLine()
    robot.run_forwards(2, False)
