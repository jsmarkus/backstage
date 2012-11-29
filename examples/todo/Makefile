#определяем зависимости
DEPS:=$(shell ls *.coffee)

build/app.js:$(DEPS)
	mkdir -p $(@D)
	browserify -p resourcify/jade $< --debug > $@

clean:
	rm -rfv build

.PHONY: clean