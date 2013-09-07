#!/usr/bin/env bash
(
	starman --listen :7210 --workers 2 --reload -R conf,lib,tmpl script/eventshot psgi 2>&1 | while read F; do echo [`date`] $F; done
) >> log/error.log &
