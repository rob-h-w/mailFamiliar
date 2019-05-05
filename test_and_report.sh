#!/bin/bash

yarn test:unit
yarn test:api
./cc-test-reporter format-coverage -t lcov -o coverage/codeclimate.unit.json coverage/lcov.info
./cc-test-reporter format-coverage -t lcov -o coverage/codeclimate.api.json coverage/api.lcov.info
./cc-test-reporter sum-coverage coverage/codeclimate.api.json coverage/codeclimate.unit.json -p 2 -o coverage/codeclimate.json
if [[ "$TRAVIS_TEST_RESULT" == 0 ]]; then ./cc-test-reporter upload-coverage -i coverage/codeclimate.json; fi
