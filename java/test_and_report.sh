#!/bin/bash
set -e

root=$(dirname $(readlink -f "$0"))
pushd $root
reporter=$root/../cc-test-reporter
export JACOCO_SOURCE_PATH=$root/src/main/java/

$reporter before-build

./mvnw test jacoco:report -B

$reporter format-coverage $root/target/site/jacoco/jacoco.xml -t jacoco --add-prefix "${root}/src/main/java/"
$reporter upload-coverage -i coverage/codeclimate.json
