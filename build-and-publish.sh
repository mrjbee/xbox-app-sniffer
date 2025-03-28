#!/bin/bash

set -x
set -e

# Inline values
MODULE_NAME="xbox-app-sniffer"
DOCKER_TAG="latest"
DOCKER_OPTS="-H ssh://192.168.0.114"
BUILD_OPTS="--platform linux/arm64"

REGISTRY=raspberrypi:5000
echo "Starting docker build in folder: "$(pwd)

# Build Docker image
docker $DOCKER_OPTS build --no-cache --build-arg MODULE_NAME=$MODULE_NAME $BUILD_OPTS -f Dockerfile -t org.monroe.team/$MODULE_NAME:$DOCKER_TAG .

# Tag the Docker image
docker $DOCKER_OPTS tag org.monroe.team/$MODULE_NAME:$DOCKER_TAG $REGISTRY/org.monroe.team/$MODULE_NAME:$DOCKER_TAG

# Push the image to the registry
docker $DOCKER_OPTS push $REGISTRY/org.monroe.team/$MODULE_NAME:$DOCKER_TAG

echo "Docker image build and published: $REGISTRY/org.monroe.team/$MODULE_NAME:$DOCKER_TAG"
