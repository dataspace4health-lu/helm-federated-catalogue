define build =
helm dependency update
helm package . -d helm
endef

define test =
docker run -d -t --name playwright --ipc=host mcr.microsoft.com/playwright:v1.45.1-jammy
docker exec playwright bash -c "mkdir app"
docker cp tests playwright:/app/tests
docker exec playwright bash -c "cd /app && npm i --silent -D @playwright/test && npx playwright install && npx -y playwright test --output /app/tests/results /app/tests/"
docker cp playwright:/app/tests/results tests/results
docker rm -f playwright
endef

SUBDIRS := $(wildcard src/*/.)
CURRENT_DIR := $(notdir $(shell pwd))

.PHONY: all build $(SUBDIRS) install test uninstall clean

all: build install test uninstall clean

build: $(SUBDIRS) helm/*.tgz
helm/*.tgz:
	$(build)

$(SUBDIRS):
	$(MAKE) -C $@ $(MAKECMDGOALS)

install:
	helm install $(CURRENT_DIR) helm/*.tgz

test:
	$(test)

uninstall:
	docker delete pod playwright 2> /dev/null || true

	helm uninstall $(CURRENT_DIR) 2> /dev/null || true
	kubectl delete pvc data-fc-portal-keycloak-postgressql-0 2> /dev/null || true

clean: $(SUBDIRS)
	rm -rf charts helm