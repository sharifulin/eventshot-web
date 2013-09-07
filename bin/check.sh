#!/usr/bin/env bash
ps auxww | grep -F 'script/eventshot ' | grep -Fv grep | grep -Fv dev
