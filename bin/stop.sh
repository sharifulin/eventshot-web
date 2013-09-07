#!/usr/bin/env bash

kill -9 `bin/check.sh | awk '{print $2}'`
