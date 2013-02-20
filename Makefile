DIST:=dist
GLOBAL:=$(DIST)/backstage.js
GLOBAL_MIN:=$(DIST)/backstage.min.js

SOURCES:=$(shell ls *.coffee)
ENTRY:=global.coffee


all:$(GLOBAL_MIN)

$(GLOBAL): $(SOURCES)
	mkdir -p $(DIST)
	browserify $(ENTRY) > $@

$(GLOBAL_MIN): $(GLOBAL)
	mkdir -p $(DIST)
	uglifyjs $< > $@

clean:
	rm -rfv $(DIST)

.PHONY: clean