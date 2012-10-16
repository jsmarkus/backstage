#определяем зависимости
DEPS:=$(shell ls *.coffee)

build/app.js:$(DEPS)
	mkdir -p $(@D)
	browserify $< --debug > $@

clean:
	rm -rfv build

.PHONY: clean