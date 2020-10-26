define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parsePrimitive = exports.extractTwoSlashComplierOptions = void 0;
    const booleanConfigRegexp = /^\/\/\s?@(\w+)$/;
    // https://regex101.com/r/8B2Wwh/1
    const valuedConfigRegexp = /^\/\/\s?@(\w+):\s?(.+)$/;
    /**
     * This is a port of the twoslash bit which grabs compiler options
     * from the source code
     */
    exports.extractTwoSlashComplierOptions = (ts) => {
        let optMap = new Map();
        // @ts-ignore - optionDeclarations is not public API
        for (const opt of ts.optionDeclarations) {
            optMap.set(opt.name.toLowerCase(), opt);
        }
        return (code) => {
            const codeLines = code.split("\n");
            const options = {};
            codeLines.forEach(line => {
                let match;
                if ((match = booleanConfigRegexp.exec(line))) {
                    if (optMap.has(match[1].toLowerCase())) {
                        options[match[1]] = true;
                        setOption(match[1], "true", options, optMap);
                    }
                }
                else if ((match = valuedConfigRegexp.exec(line))) {
                    console.log(match);
                    if (optMap.has(match[1].toLowerCase())) {
                        setOption(match[1], match[2], options, optMap);
                    }
                }
            });
            return options;
        };
    };
    function setOption(name, value, opts, optMap) {
        const opt = optMap.get(name.toLowerCase());
        if (!opt)
            return;
        switch (opt.type) {
            case "number":
            case "string":
            case "boolean":
                opts[opt.name] = parsePrimitive(value, opt.type);
                break;
            case "list":
                opts[opt.name] = value.split(",").map(v => parsePrimitive(v, opt.element.type));
                break;
            default:
                opts[opt.name] = opt.type.get(value.toLowerCase());
                if (opts[opt.name] === undefined) {
                    const keys = Array.from(opt.type.keys());
                    console.log(`Invalid value ${value} for ${opt.name}. Allowed values: ${keys.join(",")}`);
                }
        }
    }
    function parsePrimitive(value, type) {
        switch (type) {
            case "number":
                return +value;
            case "string":
                return value;
            case "boolean":
                return value.toLowerCase() === "true" || value.length === 0;
        }
        console.log(`Unknown primitive type ${type} with - ${value}`);
    }
    exports.parsePrimitive = parsePrimitive;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHdvc2xhc2hTdXBwb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc2FuZGJveC9zcmMvdHdvc2xhc2hTdXBwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7SUFBQSxNQUFNLG1CQUFtQixHQUFHLGlCQUFpQixDQUFBO0lBRTdDLGtDQUFrQztJQUNsQyxNQUFNLGtCQUFrQixHQUFHLHlCQUF5QixDQUFBO0lBS3BEOzs7T0FHRztJQUVVLFFBQUEsOEJBQThCLEdBQUcsQ0FBQyxFQUFNLEVBQUUsRUFBRTtRQUN2RCxJQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFBO1FBRW5DLG9EQUFvRDtRQUNwRCxLQUFLLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRTtZQUN2QyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7U0FDeEM7UUFFRCxPQUFPLENBQUMsSUFBWSxFQUFFLEVBQUU7WUFDdEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQyxNQUFNLE9BQU8sR0FBRyxFQUFTLENBQUE7WUFFekIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdkIsSUFBSSxLQUFLLENBQUE7Z0JBQ1QsSUFBSSxDQUFDLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtvQkFDNUMsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFO3dCQUN0QyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO3dCQUN4QixTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7cUJBQzdDO2lCQUNGO3FCQUFNLElBQUksQ0FBQyxLQUFLLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7b0JBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ2xCLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRTt3QkFDdEMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO3FCQUMvQztpQkFDRjtZQUNILENBQUMsQ0FBQyxDQUFBO1lBQ0YsT0FBTyxPQUFPLENBQUE7UUFDaEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFBO0lBRUQsU0FBUyxTQUFTLENBQUMsSUFBWSxFQUFFLEtBQWEsRUFBRSxJQUFxQixFQUFFLE1BQXdCO1FBQzdGLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDMUMsSUFBSSxDQUFDLEdBQUc7WUFBRSxPQUFNO1FBQ2hCLFFBQVEsR0FBRyxDQUFDLElBQUksRUFBRTtZQUNoQixLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssUUFBUSxDQUFDO1lBQ2QsS0FBSyxTQUFTO2dCQUNaLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsY0FBYyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2hELE1BQUs7WUFFUCxLQUFLLE1BQU07Z0JBQ1QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE9BQVEsQ0FBQyxJQUFjLENBQUMsQ0FBQyxDQUFBO2dCQUMxRixNQUFLO1lBRVA7Z0JBQ0UsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtnQkFFbEQsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRTtvQkFDaEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBUyxDQUFDLENBQUE7b0JBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEtBQUssUUFBUSxHQUFHLENBQUMsSUFBSSxxQkFBcUIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7aUJBQ3pGO1NBQ0o7SUFDSCxDQUFDO0lBRUQsU0FBZ0IsY0FBYyxDQUFDLEtBQWEsRUFBRSxJQUFZO1FBQ3hELFFBQVEsSUFBSSxFQUFFO1lBQ1osS0FBSyxRQUFRO2dCQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUE7WUFDZixLQUFLLFFBQVE7Z0JBQ1gsT0FBTyxLQUFLLENBQUE7WUFDZCxLQUFLLFNBQVM7Z0JBQ1osT0FBTyxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBO1NBQzlEO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsSUFBSSxXQUFXLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQVZELHdDQVVDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgYm9vbGVhbkNvbmZpZ1JlZ2V4cCA9IC9eXFwvXFwvXFxzP0AoXFx3KykkL1xuXG4vLyBodHRwczovL3JlZ2V4MTAxLmNvbS9yLzhCMld3aC8xXG5jb25zdCB2YWx1ZWRDb25maWdSZWdleHAgPSAvXlxcL1xcL1xccz9AKFxcdyspOlxccz8oLispJC9cblxudHlwZSBUUyA9IHR5cGVvZiBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpXG50eXBlIENvbXBpbGVyT3B0aW9ucyA9IGltcG9ydChcInR5cGVzY3JpcHRcIikuQ29tcGlsZXJPcHRpb25zXG5cbi8qKlxuICogVGhpcyBpcyBhIHBvcnQgb2YgdGhlIHR3b3NsYXNoIGJpdCB3aGljaCBncmFicyBjb21waWxlciBvcHRpb25zXG4gKiBmcm9tIHRoZSBzb3VyY2UgY29kZVxuICovXG5cbmV4cG9ydCBjb25zdCBleHRyYWN0VHdvU2xhc2hDb21wbGllck9wdGlvbnMgPSAodHM6IFRTKSA9PiB7XG4gIGxldCBvcHRNYXAgPSBuZXcgTWFwPHN0cmluZywgYW55PigpXG5cbiAgLy8gQHRzLWlnbm9yZSAtIG9wdGlvbkRlY2xhcmF0aW9ucyBpcyBub3QgcHVibGljIEFQSVxuICBmb3IgKGNvbnN0IG9wdCBvZiB0cy5vcHRpb25EZWNsYXJhdGlvbnMpIHtcbiAgICBvcHRNYXAuc2V0KG9wdC5uYW1lLnRvTG93ZXJDYXNlKCksIG9wdClcbiAgfVxuXG4gIHJldHVybiAoY29kZTogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgY29kZUxpbmVzID0gY29kZS5zcGxpdChcIlxcblwiKVxuICAgIGNvbnN0IG9wdGlvbnMgPSB7fSBhcyBhbnlcblxuICAgIGNvZGVMaW5lcy5mb3JFYWNoKGxpbmUgPT4ge1xuICAgICAgbGV0IG1hdGNoXG4gICAgICBpZiAoKG1hdGNoID0gYm9vbGVhbkNvbmZpZ1JlZ2V4cC5leGVjKGxpbmUpKSkge1xuICAgICAgICBpZiAob3B0TWFwLmhhcyhtYXRjaFsxXS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgIG9wdGlvbnNbbWF0Y2hbMV1dID0gdHJ1ZVxuICAgICAgICAgIHNldE9wdGlvbihtYXRjaFsxXSwgXCJ0cnVlXCIsIG9wdGlvbnMsIG9wdE1hcClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICgobWF0Y2ggPSB2YWx1ZWRDb25maWdSZWdleHAuZXhlYyhsaW5lKSkpIHtcbiAgICAgICAgY29uc29sZS5sb2cobWF0Y2gpXG4gICAgICAgIGlmIChvcHRNYXAuaGFzKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgc2V0T3B0aW9uKG1hdGNoWzFdLCBtYXRjaFsyXSwgb3B0aW9ucywgb3B0TWFwKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gb3B0aW9uc1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldE9wdGlvbihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIG9wdHM6IENvbXBpbGVyT3B0aW9ucywgb3B0TWFwOiBNYXA8c3RyaW5nLCBhbnk+KSB7XG4gIGNvbnN0IG9wdCA9IG9wdE1hcC5nZXQobmFtZS50b0xvd2VyQ2FzZSgpKVxuICBpZiAoIW9wdCkgcmV0dXJuXG4gIHN3aXRjaCAob3B0LnR5cGUpIHtcbiAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgY2FzZSBcInN0cmluZ1wiOlxuICAgIGNhc2UgXCJib29sZWFuXCI6XG4gICAgICBvcHRzW29wdC5uYW1lXSA9IHBhcnNlUHJpbWl0aXZlKHZhbHVlLCBvcHQudHlwZSlcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwibGlzdFwiOlxuICAgICAgb3B0c1tvcHQubmFtZV0gPSB2YWx1ZS5zcGxpdChcIixcIikubWFwKHYgPT4gcGFyc2VQcmltaXRpdmUodiwgb3B0LmVsZW1lbnQhLnR5cGUgYXMgc3RyaW5nKSlcbiAgICAgIGJyZWFrXG5cbiAgICBkZWZhdWx0OlxuICAgICAgb3B0c1tvcHQubmFtZV0gPSBvcHQudHlwZS5nZXQodmFsdWUudG9Mb3dlckNhc2UoKSlcblxuICAgICAgaWYgKG9wdHNbb3B0Lm5hbWVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3Qga2V5cyA9IEFycmF5LmZyb20ob3B0LnR5cGUua2V5cygpIGFzIGFueSlcbiAgICAgICAgY29uc29sZS5sb2coYEludmFsaWQgdmFsdWUgJHt2YWx1ZX0gZm9yICR7b3B0Lm5hbWV9LiBBbGxvd2VkIHZhbHVlczogJHtrZXlzLmpvaW4oXCIsXCIpfWApXG4gICAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUHJpbWl0aXZlKHZhbHVlOiBzdHJpbmcsIHR5cGU6IHN0cmluZyk6IGFueSB7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgIHJldHVybiArdmFsdWVcbiAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICBjYXNlIFwiYm9vbGVhblwiOlxuICAgICAgcmV0dXJuIHZhbHVlLnRvTG93ZXJDYXNlKCkgPT09IFwidHJ1ZVwiIHx8IHZhbHVlLmxlbmd0aCA9PT0gMFxuICB9XG4gIGNvbnNvbGUubG9nKGBVbmtub3duIHByaW1pdGl2ZSB0eXBlICR7dHlwZX0gd2l0aCAtICR7dmFsdWV9YClcbn1cbiJdfQ==