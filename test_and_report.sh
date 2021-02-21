#!/bin/bash
set -e

rm coverage/*.info coverage/*.json || true
./cc-test-reporter before-build
rm test/api/fixtures/standard/root/d4764d8f3c61cb5d81a5326916cac5a1c2f221acc5895c508fa3e0059d927f99/*.json || true
yarn test:unit
yarn test:api
./cc-test-reporter format-coverage -t lcov -o coverage/codeclimate.unit.json coverage/lcov.info
./cc-test-reporter format-coverage -t lcov -o coverage/codeclimate.api.json coverage/api.lcov.info
./cc-test-reporter sum-coverage coverage/codeclimate.api.json coverage/codeclimate.unit.json -p 2 -o coverage/codeclimate.json
./cc-test-reporter upload-coverage -i coverage/codeclimate.json
