define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDesignSystem = void 0;
    const el = (str, elementType, container) => {
        const el = document.createElement(elementType);
        el.innerHTML = str;
        container.appendChild(el);
        return el;
    };
    // The Playground Plugin design system
    exports.createDesignSystem = (sandbox) => {
        const ts = sandbox.ts;
        return (container) => {
            const clear = () => {
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            };
            let decorations = [];
            let decorationLock = false;
            /** Lets a HTML Element hover to highlight code in the editor  */
            const addEditorHoverToElement = (element, pos, config) => {
                element.onmouseenter = () => {
                    if (!decorationLock) {
                        const model = sandbox.getModel();
                        const start = model.getPositionAt(pos.start);
                        const end = model.getPositionAt(pos.end);
                        decorations = sandbox.editor.deltaDecorations(decorations, [
                            {
                                range: new sandbox.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                options: { inlineClassName: "highlight-" + config.type },
                            },
                        ]);
                    }
                };
                element.onmouseleave = () => {
                    if (!decorationLock) {
                        sandbox.editor.deltaDecorations(decorations, []);
                    }
                };
            };
            const declareRestartRequired = (i) => {
                if (document.getElementById("restart-required"))
                    return;
                const localize = i || window.i;
                const li = document.createElement("li");
                li.id = "restart-required";
                const a = document.createElement("a");
                a.style.color = "#c63131";
                a.textContent = localize("play_sidebar_options_restart_required");
                a.href = "#";
                a.onclick = () => document.location.reload();
                const nav = document.getElementsByClassName("navbar-right")[0];
                li.appendChild(a);
                nav.insertBefore(li, nav.firstChild);
            };
            const localStorageOption = (setting) => {
                // Think about this as being something which you want enabled by default and can suppress whether
                // it should do something.
                const invertedLogic = setting.emptyImpliesEnabled;
                const li = document.createElement("li");
                const label = document.createElement("label");
                const split = setting.oneline ? "" : "<br/>";
                label.innerHTML = `<span>${setting.display}</span>${split}${setting.blurb}`;
                const key = setting.flag;
                const input = document.createElement("input");
                input.type = "checkbox";
                input.id = key;
                input.checked = invertedLogic ? !localStorage.getItem(key) : !!localStorage.getItem(key);
                input.onchange = () => {
                    if (input.checked) {
                        if (!invertedLogic)
                            localStorage.setItem(key, "true");
                        else
                            localStorage.removeItem(key);
                    }
                    else {
                        if (invertedLogic)
                            localStorage.setItem(key, "true");
                        else
                            localStorage.removeItem(key);
                    }
                    if (setting.onchange) {
                        setting.onchange(!!localStorage.getItem(key));
                    }
                    if (setting.requireRestart) {
                        declareRestartRequired();
                    }
                };
                label.htmlFor = input.id;
                li.appendChild(input);
                li.appendChild(label);
                container.appendChild(li);
                return li;
            };
            const button = (settings) => {
                const join = document.createElement("input");
                join.type = "button";
                join.value = settings.label;
                if (settings.onclick) {
                    join.onclick = settings.onclick;
                }
                container.appendChild(join);
                return join;
            };
            const code = (code) => {
                const createCodePre = document.createElement("pre");
                const codeElement = document.createElement("code");
                codeElement.innerHTML = code;
                createCodePre.appendChild(codeElement);
                container.appendChild(createCodePre);
                return codeElement;
            };
            const showEmptyScreen = (message) => {
                clear();
                const noErrorsMessage = document.createElement("div");
                noErrorsMessage.id = "empty-message-container";
                const messageDiv = document.createElement("div");
                messageDiv.textContent = message;
                messageDiv.classList.add("empty-plugin-message");
                noErrorsMessage.appendChild(messageDiv);
                container.appendChild(noErrorsMessage);
                return noErrorsMessage;
            };
            const createTabBar = () => {
                const tabBar = document.createElement("div");
                tabBar.classList.add("playground-plugin-tabview");
                /** Support left/right in the tab bar for accessibility */
                let tabFocus = 0;
                tabBar.addEventListener("keydown", e => {
                    const tabs = tabBar.querySelectorAll('[role="tab"]');
                    // Move right
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        tabs[tabFocus].setAttribute("tabindex", "-1");
                        if (e.key === "ArrowRight") {
                            tabFocus++;
                            // If we're at the end, go to the start
                            if (tabFocus >= tabs.length) {
                                tabFocus = 0;
                            }
                            // Move left
                        }
                        else if (e.key === "ArrowLeft") {
                            tabFocus--;
                            // If we're at the start, move to the end
                            if (tabFocus < 0) {
                                tabFocus = tabs.length - 1;
                            }
                        }
                        tabs[tabFocus].setAttribute("tabindex", "0");
                        tabs[tabFocus].focus();
                    }
                });
                container.appendChild(tabBar);
                return tabBar;
            };
            const createTabButton = (text) => {
                const element = document.createElement("button");
                element.setAttribute("role", "tab");
                element.textContent = text;
                return element;
            };
            const listDiags = (model, diags) => {
                const errorUL = document.createElement("ul");
                errorUL.className = "compiler-diagnostics";
                container.appendChild(errorUL);
                diags.forEach(diag => {
                    const li = document.createElement("li");
                    li.classList.add("diagnostic");
                    switch (diag.category) {
                        case 0:
                            li.classList.add("warning");
                            break;
                        case 1:
                            li.classList.add("error");
                            break;
                        case 2:
                            li.classList.add("suggestion");
                            break;
                        case 3:
                            li.classList.add("message");
                            break;
                    }
                    if (typeof diag === "string") {
                        li.textContent = diag;
                    }
                    else {
                        li.textContent = sandbox.ts.flattenDiagnosticMessageText(diag.messageText, "\n");
                    }
                    errorUL.appendChild(li);
                    if (diag.start && diag.length) {
                        addEditorHoverToElement(li, { start: diag.start, end: diag.start + diag.length }, { type: "error" });
                    }
                    li.onclick = () => {
                        if (diag.start && diag.length) {
                            const start = model.getPositionAt(diag.start);
                            sandbox.editor.revealLine(start.lineNumber);
                            const end = model.getPositionAt(diag.start + diag.length);
                            decorations = sandbox.editor.deltaDecorations(decorations, [
                                {
                                    range: new sandbox.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                    options: { inlineClassName: "error-highlight", isWholeLine: true },
                                },
                            ]);
                            decorationLock = true;
                            setTimeout(() => {
                                decorationLock = false;
                                sandbox.editor.deltaDecorations(decorations, []);
                            }, 300);
                        }
                    };
                });
                return errorUL;
            };
            const showOptionList = (options, style) => {
                const ol = document.createElement("ol");
                ol.className = style.style === "separated" ? "playground-options" : "playground-options tight";
                options.forEach(option => {
                    if (style.style === "rows")
                        option.oneline = true;
                    if (style.requireRestart)
                        option.requireRestart = true;
                    const settingButton = localStorageOption(option);
                    ol.appendChild(settingButton);
                });
                container.appendChild(ol);
            };
            const createASTTree = (node) => {
                const div = document.createElement("div");
                div.className = "ast";
                const infoForNode = (node) => {
                    const name = ts.SyntaxKind[node.kind];
                    return {
                        name,
                    };
                };
                const renderLiteralField = (key, value, info) => {
                    const li = document.createElement("li");
                    const typeofSpan = `ast-node-${typeof value}`;
                    let suffix = "";
                    if (key === "kind") {
                        suffix = ` (SyntaxKind.${info.name})`;
                    }
                    li.innerHTML = `${key}: <span class='${typeofSpan}'>${value}</span>${suffix}`;
                    return li;
                };
                const renderSingleChild = (key, value, depth) => {
                    const li = document.createElement("li");
                    li.innerHTML = `${key}: `;
                    renderItem(li, value, depth + 1);
                    return li;
                };
                const renderManyChildren = (key, nodes, depth) => {
                    const childers = document.createElement("div");
                    childers.classList.add("ast-children");
                    const li = document.createElement("li");
                    li.innerHTML = `${key}: [<br/>`;
                    childers.appendChild(li);
                    nodes.forEach(node => {
                        renderItem(childers, node, depth + 1);
                    });
                    const liEnd = document.createElement("li");
                    liEnd.innerHTML += "]";
                    childers.appendChild(liEnd);
                    return childers;
                };
                const renderItem = (parentElement, node, depth) => {
                    const itemDiv = document.createElement("div");
                    parentElement.appendChild(itemDiv);
                    itemDiv.className = "ast-tree-start";
                    itemDiv.attributes.setNamedItem;
                    // @ts-expect-error
                    itemDiv.dataset.pos = node.pos;
                    // @ts-expect-error
                    itemDiv.dataset.end = node.end;
                    // @ts-expect-error
                    itemDiv.dataset.depth = depth;
                    if (depth === 0)
                        itemDiv.classList.add("open");
                    const info = infoForNode(node);
                    const a = document.createElement("a");
                    a.classList.add("node-name");
                    a.textContent = info.name;
                    itemDiv.appendChild(a);
                    a.onclick = _ => a.parentElement.classList.toggle("open");
                    addEditorHoverToElement(a, { start: node.pos, end: node.end }, { type: "info" });
                    const properties = document.createElement("ul");
                    properties.className = "ast-tree";
                    itemDiv.appendChild(properties);
                    Object.keys(node).forEach(field => {
                        if (typeof field === "function")
                            return;
                        if (field === "parent" || field === "flowNode")
                            return;
                        const value = node[field];
                        if (typeof value === "object" && Array.isArray(value) && value[0] && "pos" in value[0] && "end" in value[0]) {
                            //  Is an array of Nodes
                            properties.appendChild(renderManyChildren(field, value, depth));
                        }
                        else if (typeof value === "object" && "pos" in value && "end" in value) {
                            // Is a single child property
                            properties.appendChild(renderSingleChild(field, value, depth));
                        }
                        else {
                            properties.appendChild(renderLiteralField(field, value, info));
                        }
                    });
                };
                renderItem(div, node, 0);
                container.append(div);
                return div;
            };
            const createTextInput = (config) => {
                const form = document.createElement("form");
                const textbox = document.createElement("input");
                textbox.id = config.id;
                textbox.placeholder = config.placeholder;
                textbox.autocomplete = "off";
                textbox.autocapitalize = "off";
                textbox.spellcheck = false;
                // @ts-ignore
                textbox.autocorrect = "off";
                const localStorageKey = "playground-input-" + config.id;
                if (config.value) {
                    textbox.value = config.value;
                }
                else if (config.keepValueAcrossReloads) {
                    const storedQuery = localStorage.getItem(localStorageKey);
                    if (storedQuery)
                        textbox.value = storedQuery;
                }
                if (config.isEnabled) {
                    const enabled = config.isEnabled(textbox);
                    textbox.classList.add(enabled ? "good" : "bad");
                }
                else {
                    textbox.classList.add("good");
                }
                const textUpdate = (e) => {
                    const href = e.target.value.trim();
                    if (config.keepValueAcrossReloads) {
                        localStorage.setItem(localStorageKey, href);
                    }
                    if (config.onChanged)
                        config.onChanged(e.target.value, textbox);
                };
                textbox.style.width = "90%";
                textbox.style.height = "2rem";
                textbox.addEventListener("input", textUpdate);
                // Suppress the enter key
                textbox.onkeydown = (evt) => {
                    if (evt.key === "Enter" || evt.code === "Enter") {
                        config.onEnter(textbox.value, textbox);
                        return false;
                    }
                };
                form.appendChild(textbox);
                container.appendChild(form);
                return form;
            };
            return {
                /** Clear the sidebar */
                clear,
                /** Present code in a pre > code  */
                code,
                /** Ideally only use this once, and maybe even prefer using subtitles everywhere */
                title: (title) => el(title, "h3", container),
                /** Used to denote sections, give info etc */
                subtitle: (subtitle) => el(subtitle, "h4", container),
                /** Used to show a paragraph */
                p: (subtitle) => el(subtitle, "p", container),
                /** When you can't do something, or have nothing to show */
                showEmptyScreen,
                /**
                 * Shows a list of hoverable, and selectable items (errors, highlights etc) which have code representation.
                 * The type is quite small, so it should be very feasible for you to massage other data to fit into this function
                 */
                listDiags,
                /** Shows a single option in local storage (adds an li to the container BTW) */
                localStorageOption,
                /** Uses localStorageOption to create a list of options */
                showOptionList,
                /** Shows a full-width text input */
                createTextInput,
                /** Renders an AST tree */
                createASTTree,
                /** Creates an input button */
                button,
                /** Used to re-create a UI like the tab bar at the top of the plugins section */
                createTabBar,
                /** Used with createTabBar to add buttons */
                createTabButton,
                /** A general "restart your browser" message  */
                declareRestartRequired,
            };
        };
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlRGVzaWduU3lzdGVtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGxheWdyb3VuZC9zcmMvZHMvY3JlYXRlRGVzaWduU3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7SUFtQkEsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFXLEVBQUUsV0FBbUIsRUFBRSxTQUFrQixFQUFFLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5QyxFQUFFLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQTtRQUNsQixTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pCLE9BQU8sRUFBRSxDQUFBO0lBQ1gsQ0FBQyxDQUFBO0lBRUQsc0NBQXNDO0lBQ3pCLFFBQUEsa0JBQWtCLEdBQUcsQ0FBQyxPQUFnQixFQUFFLEVBQUU7UUFDckQsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQTtRQUVyQixPQUFPLENBQUMsU0FBa0IsRUFBRSxFQUFFO1lBQzVCLE1BQU0sS0FBSyxHQUFHLEdBQUcsRUFBRTtnQkFDakIsT0FBTyxTQUFTLENBQUMsVUFBVSxFQUFFO29CQUMzQixTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtpQkFDNUM7WUFDSCxDQUFDLENBQUE7WUFDRCxJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUE7WUFDOUIsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFBO1lBRTFCLGlFQUFpRTtZQUNqRSxNQUFNLHVCQUF1QixHQUFHLENBQzlCLE9BQW9CLEVBQ3BCLEdBQW1DLEVBQ25DLE1BQWtDLEVBQ2xDLEVBQUU7Z0JBQ0YsT0FBTyxDQUFDLFlBQVksR0FBRyxHQUFHLEVBQUU7b0JBQzFCLElBQUksQ0FBQyxjQUFjLEVBQUU7d0JBQ25CLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVB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QzFCLGFBQWE7Z0JBQ2IsOEJBQThCO2dCQUM5QixNQUFNO2dCQUNOLGdGQUFnRjtnQkFDaEYsWUFBWTtnQkFDWiw0Q0FBNEM7Z0JBQzVDLGVBQWU7Z0JBQ2YsZ0RBQWdEO2dCQUNoRCxzQkFBc0I7YUFDdkIsQ0FBQTtRQUNILENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgU2FuZGJveCB9IGZyb20gXCJ0eXBlc2NyaXB0bGFuZy1vcmcvc3RhdGljL2pzL3NhbmRib3hcIlxuaW1wb3J0IHR5cGUgeyBEaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uLCBOb2RlIH0gZnJvbSBcInR5cGVzY3JpcHRcIlxuXG5leHBvcnQgdHlwZSBMb2NhbFN0b3JhZ2VPcHRpb24gPSB7XG4gIGJsdXJiOiBzdHJpbmdcbiAgZmxhZzogc3RyaW5nXG4gIGRpc3BsYXk6IHN0cmluZ1xuXG4gIGVtcHR5SW1wbGllc0VuYWJsZWQ/OiB0cnVlXG4gIG9uZWxpbmU/OiB0cnVlXG4gIHJlcXVpcmVSZXN0YXJ0PzogdHJ1ZVxuICBvbmNoYW5nZT86IChuZXdWYWx1ZTogYm9vbGVhbikgPT4gdm9pZFxufVxuXG5leHBvcnQgdHlwZSBPcHRpb25zTGlzdENvbmZpZyA9IHtcbiAgc3R5bGU6IFwic2VwYXJhdGVkXCIgfCBcInJvd3NcIlxuICByZXF1aXJlUmVzdGFydD86IHRydWVcbn1cblxuY29uc3QgZWwgPSAoc3RyOiBzdHJpbmcsIGVsZW1lbnRUeXBlOiBzdHJpbmcsIGNvbnRhaW5lcjogRWxlbWVudCkgPT4ge1xuICBjb25zdCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWxlbWVudFR5cGUpXG4gIGVsLmlubmVySFRNTCA9IHN0clxuICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZWwpXG4gIHJldHVybiBlbFxufVxuXG4vLyBUaGUgUGxheWdyb3VuZCBQbHVnaW4gZGVzaWduIHN5c3RlbVxuZXhwb3J0IGNvbnN0IGNyZWF0ZURlc2lnblN5c3RlbSA9IChzYW5kYm94OiBTYW5kYm94KSA9PiB7XG4gIGNvbnN0IHRzID0gc2FuZGJveC50c1xuXG4gIHJldHVybiAoY29udGFpbmVyOiBFbGVtZW50KSA9PiB7XG4gICAgY29uc3QgY2xlYXIgPSAoKSA9PiB7XG4gICAgICB3aGlsZSAoY29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkKGNvbnRhaW5lci5maXJzdENoaWxkKVxuICAgICAgfVxuICAgIH1cbiAgICBsZXQgZGVjb3JhdGlvbnM6IHN0cmluZ1tdID0gW11cbiAgICBsZXQgZGVjb3JhdGlvbkxvY2sgPSBmYWxzZVxuXG4gICAgLyoqIExldHMgYSBIVE1MIEVsZW1lbnQgaG92ZXIgdG8gaGlnaGxpZ2h0IGNvZGUgaW4gdGhlIGVkaXRvciAgKi9cbiAgICBjb25zdCBhZGRFZGl0b3JIb3ZlclRvRWxlbWVudCA9IChcbiAgICAgIGVsZW1lbnQ6IEhUTUxFbGVtZW50LFxuICAgICAgcG9zOiB7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyIH0sXG4gICAgICBjb25maWc6IHsgdHlwZTogXCJlcnJvclwiIHwgXCJpbmZvXCIgfVxuICAgICkgPT4ge1xuICAgICAgZWxlbWVudC5vbm1vdXNlZW50ZXIgPSAoKSA9PiB7XG4gICAgICAgIGlmICghZGVjb3JhdGlvbkxvY2spIHtcbiAgICAgICAgICBjb25zdCBtb2RlbCA9IHNhbmRib3guZ2V0TW9kZWwoKVxuICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbW9kZWwuZ2V0UG9zaXRpb25BdChwb3Muc3RhcnQpXG4gICAgICAgICAgY29uc3QgZW5kID0gbW9kZWwuZ2V0UG9zaXRpb25BdChwb3MuZW5kKVxuICAgICAgICAgIGRlY29yYXRpb25zID0gc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICByYW5nZTogbmV3IHNhbmRib3gubW9uYWNvLlJhbmdlKHN0YXJ0LmxpbmVOdW1iZXIsIHN0YXJ0LmNvbHVtbiwgZW5kLmxpbmVOdW1iZXIsIGVuZC5jb2x1bW4pLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7IGlubGluZUNsYXNzTmFtZTogXCJoaWdobGlnaHQtXCIgKyBjb25maWcudHlwZSB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGVsZW1lbnQub25tb3VzZWxlYXZlID0gKCkgPT4ge1xuICAgICAgICBpZiAoIWRlY29yYXRpb25Mb2NrKSB7XG4gICAgICAgICAgc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW10pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJlUmVzdGFydFJlcXVpcmVkID0gKGk/OiAoa2V5OiBzdHJpbmcpID0+IHN0cmluZykgPT4ge1xuICAgICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVzdGFydC1yZXF1aXJlZFwiKSkgcmV0dXJuXG4gICAgICBjb25zdCBsb2NhbGl6ZSA9IGkgfHwgKHdpbmRvdyBhcyBhbnkpLmlcbiAgICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpXG4gICAgICBsaS5pZCA9IFwicmVzdGFydC1yZXF1aXJlZFwiXG5cbiAgICAgIGNvbnN0IGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKVxuICAgICAgYS5zdHlsZS5jb2xvciA9IFwiI2M2MzEzMVwiXG4gICAgICBhLnRleHRDb250ZW50ID0gbG9jYWxpemUoXCJwbGF5X3NpZGViYXJfb3B0aW9uc19yZXN0YXJ0X3JlcXVpcmVkXCIpXG4gICAgICBhLmhyZWYgPSBcIiNcIlxuICAgICAgYS5vbmNsaWNrID0gKCkgPT4gZG9jdW1lbnQubG9jYXRpb24ucmVsb2FkKClcblxuICAgICAgY29uc3QgbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIm5hdmJhci1yaWdodFwiKVswXVxuICAgICAgbGkuYXBwZW5kQ2hpbGQoYSlcbiAgICAgIG5hdi5pbnNlcnRCZWZvcmUobGksIG5hdi5maXJzdENoaWxkKVxuICAgIH1cblxuICAgIGNvbnN0IGxvY2FsU3RvcmFnZU9wdGlvbiA9IChzZXR0aW5nOiBMb2NhbFN0b3JhZ2VPcHRpb24pID0+IHtcbiAgICAgIC8vIFRoaW5rIGFib3V0IHRoaXMgYXMgYmVpbmcgc29tZXRoaW5nIHdoaWNoIHlvdSB3YW50IGVuYWJsZWQgYnkgZGVmYXVsdCBhbmQgY2FuIHN1cHByZXNzIHdoZXRoZXJcbiAgICAgIC8vIGl0IHNob3VsZCBkbyBzb21ldGhpbmcuXG4gICAgICBjb25zdCBpbnZlcnRlZExvZ2ljID0gc2V0dGluZy5lbXB0eUltcGxpZXNFbmFibGVkXG5cbiAgICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpXG4gICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsYWJlbFwiKVxuICAgICAgY29uc3Qgc3BsaXQgPSBzZXR0aW5nLm9uZWxpbmUgPyBcIlwiIDogXCI8YnIvPlwiXG4gICAgICBsYWJlbC5pbm5lckhUTUwgPSBgPHNwYW4+JHtzZXR0aW5nLmRpc3BsYXl9PC9zcGFuPiR7c3BsaXR9JHtzZXR0aW5nLmJsdXJifWBcblxuICAgICAgY29uc3Qga2V5ID0gc2V0dGluZy5mbGFnXG4gICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKVxuICAgICAgaW5wdXQudHlwZSA9IFwiY2hlY2tib3hcIlxuICAgICAgaW5wdXQuaWQgPSBrZXlcblxuICAgICAgaW5wdXQuY2hlY2tlZCA9IGludmVydGVkTG9naWMgPyAhbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KSA6ICEhbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KVxuXG4gICAgICBpbnB1dC5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgaWYgKGlucHV0LmNoZWNrZWQpIHtcbiAgICAgICAgICBpZiAoIWludmVydGVkTG9naWMpIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgXCJ0cnVlXCIpXG4gICAgICAgICAgZWxzZSBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGludmVydGVkTG9naWMpIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgXCJ0cnVlXCIpXG4gICAgICAgICAgZWxzZSBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2V0dGluZy5vbmNoYW5nZSkge1xuICAgICAgICAgIHNldHRpbmcub25jaGFuZ2UoISFsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpKVxuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5nLnJlcXVpcmVSZXN0YXJ0KSB7XG4gICAgICAgICAgZGVjbGFyZVJlc3RhcnRSZXF1aXJlZCgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbGFiZWwuaHRtbEZvciA9IGlucHV0LmlkXG5cbiAgICAgIGxpLmFwcGVuZENoaWxkKGlucHV0KVxuICAgICAgbGkuYXBwZW5kQ2hpbGQobGFiZWwpXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobGkpXG4gICAgICByZXR1cm4gbGlcbiAgICB9XG5cbiAgICBjb25zdCBidXR0b24gPSAoc2V0dGluZ3M6IHsgbGFiZWw6IHN0cmluZzsgb25jbGljaz86IChldjogTW91c2VFdmVudCkgPT4gdm9pZCB9KSA9PiB7XG4gICAgICBjb25zdCBqb2luID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpXG4gICAgICBqb2luLnR5cGUgPSBcImJ1dHRvblwiXG4gICAgICBqb2luLnZhbHVlID0gc2V0dGluZ3MubGFiZWxcbiAgICAgIGlmIChzZXR0aW5ncy5vbmNsaWNrKSB7XG4gICAgICAgIGpvaW4ub25jbGljayA9IHNldHRpbmdzLm9uY2xpY2tcbiAgICAgIH1cblxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGpvaW4pXG4gICAgICByZXR1cm4gam9pblxuICAgIH1cblxuICAgIGNvbnN0IGNvZGUgPSAoY29kZTogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBjcmVhdGVDb2RlUHJlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInByZVwiKVxuICAgICAgY29uc3QgY29kZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY29kZVwiKVxuXG4gICAgICBjb2RlRWxlbWVudC5pbm5lckhUTUwgPSBjb2RlXG5cbiAgICAgIGNyZWF0ZUNvZGVQcmUuYXBwZW5kQ2hpbGQoY29kZUVsZW1lbnQpXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY3JlYXRlQ29kZVByZSlcblxuICAgICAgcmV0dXJuIGNvZGVFbGVtZW50XG4gICAgfVxuXG4gICAgY29uc3Qgc2hvd0VtcHR5U2NyZWVuID0gKG1lc3NhZ2U6IHN0cmluZykgPT4ge1xuICAgICAgY2xlYXIoKVxuXG4gICAgICBjb25zdCBub0Vycm9yc01lc3NhZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICBub0Vycm9yc01lc3NhZ2UuaWQgPSBcImVtcHR5LW1lc3NhZ2UtY29udGFpbmVyXCJcblxuICAgICAgY29uc3QgbWVzc2FnZURpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgIG1lc3NhZ2VEaXYudGV4dENvbnRlbnQgPSBtZXNzYWdlXG4gICAgICBtZXNzYWdlRGl2LmNsYXNzTGlzdC5hZGQoXCJlbXB0eS1wbHVnaW4tbWVzc2FnZVwiKVxuICAgICAgbm9FcnJvcnNNZXNzYWdlLmFwcGVuZENoaWxkKG1lc3NhZ2VEaXYpXG5cbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChub0Vycm9yc01lc3NhZ2UpXG4gICAgICByZXR1cm4gbm9FcnJvcnNNZXNzYWdlXG4gICAgfVxuXG4gICAgY29uc3QgY3JlYXRlVGFiQmFyID0gKCkgPT4ge1xuICAgICAgY29uc3QgdGFiQmFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgdGFiQmFyLmNsYXNzTGlzdC5hZGQoXCJwbGF5Z3JvdW5kLXBsdWdpbi10YWJ2aWV3XCIpXG5cbiAgICAgIC8qKiBTdXBwb3J0IGxlZnQvcmlnaHQgaW4gdGhlIHRhYiBiYXIgZm9yIGFjY2Vzc2liaWxpdHkgKi9cbiAgICAgIGxldCB0YWJGb2N1cyA9IDBcbiAgICAgIHRhYkJhci5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBlID0+IHtcbiAgICAgICAgY29uc3QgdGFicyA9IHRhYkJhci5xdWVyeVNlbGVjdG9yQWxsKCdbcm9sZT1cInRhYlwiXScpXG4gICAgICAgIC8vIE1vdmUgcmlnaHRcbiAgICAgICAgaWYgKGUua2V5ID09PSBcIkFycm93UmlnaHRcIiB8fCBlLmtleSA9PT0gXCJBcnJvd0xlZnRcIikge1xuICAgICAgICAgIHRhYnNbdGFiRm9jdXNdLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIFwiLTFcIilcbiAgICAgICAgICBpZiAoZS5rZXkgPT09IFwiQXJyb3dSaWdodFwiKSB7XG4gICAgICAgICAgICB0YWJGb2N1cysrXG4gICAgICAgICAgICAvLyBJZiB3ZSdyZSBhdCB0aGUgZW5kLCBnbyB0byB0aGUgc3RhcnRcbiAgICAgICAgICAgIGlmICh0YWJGb2N1cyA+PSB0YWJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0YWJGb2N1cyA9IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1vdmUgbGVmdFxuICAgICAgICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiQXJyb3dMZWZ0XCIpIHtcbiAgICAgICAgICAgIHRhYkZvY3VzLS1cbiAgICAgICAgICAgIC8vIElmIHdlJ3JlIGF0IHRoZSBzdGFydCwgbW92ZSB0byB0aGUgZW5kXG4gICAgICAgICAgICBpZiAodGFiRm9jdXMgPCAwKSB7XG4gICAgICAgICAgICAgIHRhYkZvY3VzID0gdGFicy5sZW5ndGggLSAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGFic1t0YWJGb2N1c10uc2V0QXR0cmlidXRlKFwidGFiaW5kZXhcIiwgXCIwXCIpXG4gICAgICAgICAgOyh0YWJzW3RhYkZvY3VzXSBhcyBhbnkpLmZvY3VzKClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRhYkJhcilcbiAgICAgIHJldHVybiB0YWJCYXJcbiAgICB9XG5cbiAgICBjb25zdCBjcmVhdGVUYWJCdXR0b24gPSAodGV4dDogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKVxuICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJyb2xlXCIsIFwidGFiXCIpXG4gICAgICBlbGVtZW50LnRleHRDb250ZW50ID0gdGV4dFxuICAgICAgcmV0dXJuIGVsZW1lbnRcbiAgICB9XG5cbiAgICBjb25zdCBsaXN0RGlhZ3MgPSAobW9kZWw6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuZWRpdG9yLklUZXh0TW9kZWwsIGRpYWdzOiBEaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW10pID0+IHtcbiAgICAgIGNvbnN0IGVycm9yVUwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidWxcIilcbiAgICAgIGVycm9yVUwuY2xhc3NOYW1lID0gXCJjb21waWxlci1kaWFnbm9zdGljc1wiXG5cbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChlcnJvclVMKVxuXG4gICAgICBkaWFncy5mb3JFYWNoKGRpYWcgPT4ge1xuICAgICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKVxuICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKFwiZGlhZ25vc3RpY1wiKVxuICAgICAgICBzd2l0Y2ggKGRpYWcuY2F0ZWdvcnkpIHtcbiAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKFwid2FybmluZ1wiKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKFwiZXJyb3JcIilcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgbGkuY2xhc3NMaXN0LmFkZChcInN1Z2dlc3Rpb25cIilcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgbGkuY2xhc3NMaXN0LmFkZChcIm1lc3NhZ2VcIilcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGRpYWcgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICBsaS50ZXh0Q29udGVudCA9IGRpYWdcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaS50ZXh0Q29udGVudCA9IHNhbmRib3gudHMuZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlVGV4dChkaWFnLm1lc3NhZ2VUZXh0LCBcIlxcblwiKVxuICAgICAgICB9XG4gICAgICAgIGVycm9yVUwuYXBwZW5kQ2hpbGQobGkpXG5cbiAgICAgICAgaWYgKGRpYWcuc3RhcnQgJiYgZGlhZy5sZW5ndGgpIHtcbiAgICAgICAgICBhZGRFZGl0b3JIb3ZlclRvRWxlbWVudChsaSwgeyBzdGFydDogZGlhZy5zdGFydCwgZW5kOiBkaWFnLnN0YXJ0ICsgZGlhZy5sZW5ndGggfSwgeyB0eXBlOiBcImVycm9yXCIgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGxpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgaWYgKGRpYWcuc3RhcnQgJiYgZGlhZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbW9kZWwuZ2V0UG9zaXRpb25BdChkaWFnLnN0YXJ0KVxuICAgICAgICAgICAgc2FuZGJveC5lZGl0b3IucmV2ZWFsTGluZShzdGFydC5saW5lTnVtYmVyKVxuXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBtb2RlbC5nZXRQb3NpdGlvbkF0KGRpYWcuc3RhcnQgKyBkaWFnLmxlbmd0aClcbiAgICAgICAgICAgIGRlY29yYXRpb25zID0gc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmFuZ2U6IG5ldyBzYW5kYm94Lm1vbmFjby5SYW5nZShzdGFydC5saW5lTnVtYmVyLCBzdGFydC5jb2x1bW4sIGVuZC5saW5lTnVtYmVyLCBlbmQuY29sdW1uKSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiB7IGlubGluZUNsYXNzTmFtZTogXCJlcnJvci1oaWdobGlnaHRcIiwgaXNXaG9sZUxpbmU6IHRydWUgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0pXG5cbiAgICAgICAgICAgIGRlY29yYXRpb25Mb2NrID0gdHJ1ZVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGRlY29yYXRpb25Mb2NrID0gZmFsc2VcbiAgICAgICAgICAgICAgc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW10pXG4gICAgICAgICAgICB9LCAzMDApXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgcmV0dXJuIGVycm9yVUxcbiAgICB9XG5cbiAgICBjb25zdCBzaG93T3B0aW9uTGlzdCA9IChvcHRpb25zOiBMb2NhbFN0b3JhZ2VPcHRpb25bXSwgc3R5bGU6IE9wdGlvbnNMaXN0Q29uZmlnKSA9PiB7XG4gICAgICBjb25zdCBvbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvbFwiKVxuICAgICAgb2wuY2xhc3NOYW1lID0gc3R5bGUuc3R5bGUgPT09IFwic2VwYXJhdGVkXCIgPyBcInBsYXlncm91bmQtb3B0aW9uc1wiIDogXCJwbGF5Z3JvdW5kLW9wdGlvbnMgdGlnaHRcIlxuXG4gICAgICBvcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlID09PSBcInJvd3NcIikgb3B0aW9uLm9uZWxpbmUgPSB0cnVlXG4gICAgICAgIGlmIChzdHlsZS5yZXF1aXJlUmVzdGFydCkgb3B0aW9uLnJlcXVpcmVSZXN0YXJ0ID0gdHJ1ZVxuXG4gICAgICAgIGNvbnN0IHNldHRpbmdCdXR0b24gPSBsb2NhbFN0b3JhZ2VPcHRpb24ob3B0aW9uKVxuICAgICAgICBvbC5hcHBlbmRDaGlsZChzZXR0aW5nQnV0dG9uKVxuICAgICAgfSlcblxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG9sKVxuICAgIH1cblxuICAgIGNvbnN0IGNyZWF0ZUFTVFRyZWUgPSAobm9kZTogTm9kZSkgPT4ge1xuICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgZGl2LmNsYXNzTmFtZSA9IFwiYXN0XCJcblxuICAgICAgY29uc3QgaW5mb0Zvck5vZGUgPSAobm9kZTogTm9kZSkgPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gdHMuU3ludGF4S2luZFtub2RlLmtpbmRdXG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuYW1lLFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHR5cGUgTm9kZUluZm8gPSBSZXR1cm5UeXBlPHR5cGVvZiBpbmZvRm9yTm9kZT5cblxuICAgICAgY29uc3QgcmVuZGVyTGl0ZXJhbEZpZWxkID0gKGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBpbmZvOiBOb2RlSW5mbykgPT4ge1xuICAgICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKVxuICAgICAgICBjb25zdCB0eXBlb2ZTcGFuID0gYGFzdC1ub2RlLSR7dHlwZW9mIHZhbHVlfWBcbiAgICAgICAgbGV0IHN1ZmZpeCA9IFwiXCJcbiAgICAgICAgaWYgKGtleSA9PT0gXCJraW5kXCIpIHtcbiAgICAgICAgICBzdWZmaXggPSBgIChTeW50YXhLaW5kLiR7aW5mby5uYW1lfSlgXG4gICAgICAgIH1cbiAgICAgICAgbGkuaW5uZXJIVE1MID0gYCR7a2V5fTogPHNwYW4gY2xhc3M9JyR7dHlwZW9mU3Bhbn0nPiR7dmFsdWV9PC9zcGFuPiR7c3VmZml4fWBcbiAgICAgICAgcmV0dXJuIGxpXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbmRlclNpbmdsZUNoaWxkID0gKGtleTogc3RyaW5nLCB2YWx1ZTogTm9kZSwgZGVwdGg6IG51bWJlcikgPT4ge1xuICAgICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKVxuICAgICAgICBsaS5pbm5lckhUTUwgPSBgJHtrZXl9OiBgXG5cbiAgICAgICAgcmVuZGVySXRlbShsaSwgdmFsdWUsIGRlcHRoICsgMSlcbiAgICAgICAgcmV0dXJuIGxpXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbmRlck1hbnlDaGlsZHJlbiA9IChrZXk6IHN0cmluZywgbm9kZXM6IE5vZGVbXSwgZGVwdGg6IG51bWJlcikgPT4ge1xuICAgICAgICBjb25zdCBjaGlsZGVycyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgY2hpbGRlcnMuY2xhc3NMaXN0LmFkZChcImFzdC1jaGlsZHJlblwiKVxuXG4gICAgICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpXG4gICAgICAgIGxpLmlubmVySFRNTCA9IGAke2tleX06IFs8YnIvPmBcbiAgICAgICAgY2hpbGRlcnMuYXBwZW5kQ2hpbGQobGkpXG5cbiAgICAgICAgbm9kZXMuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgICByZW5kZXJJdGVtKGNoaWxkZXJzLCBub2RlLCBkZXB0aCArIDEpXG4gICAgICAgIH0pXG5cbiAgICAgICAgY29uc3QgbGlFbmQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICAgICAgbGlFbmQuaW5uZXJIVE1MICs9IFwiXVwiXG4gICAgICAgIGNoaWxkZXJzLmFwcGVuZENoaWxkKGxpRW5kKVxuICAgICAgICByZXR1cm4gY2hpbGRlcnNcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVuZGVySXRlbSA9IChwYXJlbnRFbGVtZW50OiBFbGVtZW50LCBub2RlOiBOb2RlLCBkZXB0aDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IGl0ZW1EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoaXRlbURpdilcbiAgICAgICAgaXRlbURpdi5jbGFzc05hbWUgPSBcImFzdC10cmVlLXN0YXJ0XCJcbiAgICAgICAgaXRlbURpdi5hdHRyaWJ1dGVzLnNldE5hbWVkSXRlbVxuICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgICAgIGl0ZW1EaXYuZGF0YXNldC5wb3MgPSBub2RlLnBvc1xuICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgICAgIGl0ZW1EaXYuZGF0YXNldC5lbmQgPSBub2RlLmVuZFxuICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgICAgIGl0ZW1EaXYuZGF0YXNldC5kZXB0aCA9IGRlcHRoXG5cbiAgICAgICAgaWYgKGRlcHRoID09PSAwKSBpdGVtRGl2LmNsYXNzTGlzdC5hZGQoXCJvcGVuXCIpXG5cbiAgICAgICAgY29uc3QgaW5mbyA9IGluZm9Gb3JOb2RlKG5vZGUpXG5cbiAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpXG4gICAgICAgIGEuY2xhc3NMaXN0LmFkZChcIm5vZGUtbmFtZVwiKVxuICAgICAgICBhLnRleHRDb250ZW50ID0gaW5mby5uYW1lXG4gICAgICAgIGl0ZW1EaXYuYXBwZW5kQ2hpbGQoYSlcbiAgICAgICAgYS5vbmNsaWNrID0gXyA9PiBhLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC50b2dnbGUoXCJvcGVuXCIpXG4gICAgICAgIGFkZEVkaXRvckhvdmVyVG9FbGVtZW50KGEsIHsgc3RhcnQ6IG5vZGUucG9zLCBlbmQ6IG5vZGUuZW5kIH0sIHsgdHlwZTogXCJpbmZvXCIgfSlcblxuICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInVsXCIpXG4gICAgICAgIHByb3BlcnRpZXMuY2xhc3NOYW1lID0gXCJhc3QtdHJlZVwiXG4gICAgICAgIGl0ZW1EaXYuYXBwZW5kQ2hpbGQocHJvcGVydGllcylcblxuICAgICAgICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIGZpZWxkID09PSBcImZ1bmN0aW9uXCIpIHJldHVyblxuICAgICAgICAgIGlmIChmaWVsZCA9PT0gXCJwYXJlbnRcIiB8fCBmaWVsZCA9PT0gXCJmbG93Tm9kZVwiKSByZXR1cm5cblxuICAgICAgICAgIGNvbnN0IHZhbHVlID0gKG5vZGUgYXMgYW55KVtmaWVsZF1cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlWzBdICYmIFwicG9zXCIgaW4gdmFsdWVbMF0gJiYgXCJlbmRcIiBpbiB2YWx1ZVswXSkge1xuICAgICAgICAgICAgLy8gIElzIGFuIGFycmF5IG9mIE5vZGVzXG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmFwcGVuZENoaWxkKHJlbmRlck1hbnlDaGlsZHJlbihmaWVsZCwgdmFsdWUsIGRlcHRoKSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiBcInBvc1wiIGluIHZhbHVlICYmIFwiZW5kXCIgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIElzIGEgc2luZ2xlIGNoaWxkIHByb3BlcnR5XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmFwcGVuZENoaWxkKHJlbmRlclNpbmdsZUNoaWxkKGZpZWxkLCB2YWx1ZSwgZGVwdGgpKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmFwcGVuZENoaWxkKHJlbmRlckxpdGVyYWxGaWVsZChmaWVsZCwgdmFsdWUsIGluZm8pKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgcmVuZGVySXRlbShkaXYsIG5vZGUsIDApXG4gICAgICBjb250YWluZXIuYXBwZW5kKGRpdilcbiAgICAgIHJldHVybiBkaXZcbiAgICB9XG5cbiAgICB0eXBlIFRleHRJbnB1dENvbmZpZyA9IHtcbiAgICAgIGlkOiBzdHJpbmdcbiAgICAgIHBsYWNlaG9sZGVyOiBzdHJpbmdcblxuICAgICAgb25DaGFuZ2VkPzogKHRleHQ6IHN0cmluZywgaW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQpID0+IHZvaWRcbiAgICAgIG9uRW50ZXI6ICh0ZXh0OiBzdHJpbmcsIGlucHV0OiBIVE1MSW5wdXRFbGVtZW50KSA9PiB2b2lkXG5cbiAgICAgIHZhbHVlPzogc3RyaW5nXG4gICAgICBrZWVwVmFsdWVBY3Jvc3NSZWxvYWRzPzogdHJ1ZVxuICAgICAgaXNFbmFibGVkPzogKGlucHV0OiBIVE1MSW5wdXRFbGVtZW50KSA9PiBib29sZWFuXG4gICAgfVxuXG4gICAgY29uc3QgY3JlYXRlVGV4dElucHV0ID0gKGNvbmZpZzogVGV4dElucHV0Q29uZmlnKSA9PiB7XG4gICAgICBjb25zdCBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImZvcm1cIilcblxuICAgICAgY29uc3QgdGV4dGJveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKVxuICAgICAgdGV4dGJveC5pZCA9IGNvbmZpZy5pZFxuICAgICAgdGV4dGJveC5wbGFjZWhvbGRlciA9IGNvbmZpZy5wbGFjZWhvbGRlclxuICAgICAgdGV4dGJveC5hdXRvY29tcGxldGUgPSBcIm9mZlwiXG4gICAgICB0ZXh0Ym94LmF1dG9jYXBpdGFsaXplID0gXCJvZmZcIlxuICAgICAgdGV4dGJveC5zcGVsbGNoZWNrID0gZmFsc2VcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIHRleHRib3guYXV0b2NvcnJlY3QgPSBcIm9mZlwiXG5cbiAgICAgIGNvbnN0IGxvY2FsU3RvcmFnZUtleSA9IFwicGxheWdyb3VuZC1pbnB1dC1cIiArIGNvbmZpZy5pZFxuXG4gICAgICBpZiAoY29uZmlnLnZhbHVlKSB7XG4gICAgICAgIHRleHRib3gudmFsdWUgPSBjb25maWcudmFsdWVcbiAgICAgIH0gZWxzZSBpZiAoY29uZmlnLmtlZXBWYWx1ZUFjcm9zc1JlbG9hZHMpIHtcbiAgICAgICAgY29uc3Qgc3RvcmVkUXVlcnkgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShsb2NhbFN0b3JhZ2VLZXkpXG4gICAgICAgIGlmIChzdG9yZWRRdWVyeSkgdGV4dGJveC52YWx1ZSA9IHN0b3JlZFF1ZXJ5XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcuaXNFbmFibGVkKSB7XG4gICAgICAgIGNvbnN0IGVuYWJsZWQgPSBjb25maWcuaXNFbmFibGVkKHRleHRib3gpXG4gICAgICAgIHRleHRib3guY2xhc3NMaXN0LmFkZChlbmFibGVkID8gXCJnb29kXCIgOiBcImJhZFwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGV4dGJveC5jbGFzc0xpc3QuYWRkKFwiZ29vZFwiKVxuICAgICAgfVxuXG4gICAgICBjb25zdCB0ZXh0VXBkYXRlID0gKGU6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBocmVmID0gZS50YXJnZXQudmFsdWUudHJpbSgpXG4gICAgICAgIGlmIChjb25maWcua2VlcFZhbHVlQWNyb3NzUmVsb2Fkcykge1xuICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGxvY2FsU3RvcmFnZUtleSwgaHJlZilcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZmlnLm9uQ2hhbmdlZCkgY29uZmlnLm9uQ2hhbmdlZChlLnRhcmdldC52YWx1ZSwgdGV4dGJveClcbiAgICAgIH1cblxuICAgICAgdGV4dGJveC5zdHlsZS53aWR0aCA9IFwiOTAlXCJcbiAgICAgIHRleHRib3guc3R5bGUuaGVpZ2h0ID0gXCIycmVtXCJcbiAgICAgIHRleHRib3guYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIHRleHRVcGRhdGUpXG5cbiAgICAgIC8vIFN1cHByZXNzIHRoZSBlbnRlciBrZXlcbiAgICAgIHRleHRib3gub25rZXlkb3duID0gKGV2dDogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgICBpZiAoZXZ0LmtleSA9PT0gXCJFbnRlclwiIHx8IGV2dC5jb2RlID09PSBcIkVudGVyXCIpIHtcbiAgICAgICAgICBjb25maWcub25FbnRlcih0ZXh0Ym94LnZhbHVlLCB0ZXh0Ym94KVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvcm0uYXBwZW5kQ2hpbGQodGV4dGJveClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChmb3JtKVxuICAgICAgcmV0dXJuIGZvcm1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgLyoqIENsZWFyIHRoZSBzaWRlYmFyICovXG4gICAgICBjbGVhcixcbiAgICAgIC8qKiBQcmVzZW50IGNvZGUgaW4gYSBwcmUgPiBjb2RlICAqL1xuICAgICAgY29kZSxcbiAgICAgIC8qKiBJZGVhbGx5IG9ubHkgdXNlIHRoaXMgb25jZSwgYW5kIG1heWJlIGV2ZW4gcHJlZmVyIHVzaW5nIHN1YnRpdGxlcyBldmVyeXdoZXJlICovXG4gICAgICB0aXRsZTogKHRpdGxlOiBzdHJpbmcpID0+IGVsKHRpdGxlLCBcImgzXCIsIGNvbnRhaW5lciksXG4gICAgICAvKiogVXNlZCB0byBkZW5vdGUgc2VjdGlvbnMsIGdpdmUgaW5mbyBldGMgKi9cbiAgICAgIHN1YnRpdGxlOiAoc3VidGl0bGU6IHN0cmluZykgPT4gZWwoc3VidGl0bGUsIFwiaDRcIiwgY29udGFpbmVyKSxcbiAgICAgIC8qKiBVc2VkIHRvIHNob3cgYSBwYXJhZ3JhcGggKi9cbiAgICAgIHA6IChzdWJ0aXRsZTogc3RyaW5nKSA9PiBlbChzdWJ0aXRsZSwgXCJwXCIsIGNvbnRhaW5lciksXG4gICAgICAvKiogV2hlbiB5b3UgY2FuJ3QgZG8gc29tZXRoaW5nLCBvciBoYXZlIG5vdGhpbmcgdG8gc2hvdyAqL1xuICAgICAgc2hvd0VtcHR5U2NyZWVuLFxuICAgICAgLyoqXG4gICAgICAgKiBTaG93cyBhIGxpc3Qgb2YgaG92ZXJhYmxlLCBhbmQgc2VsZWN0YWJsZSBpdGVtcyAoZXJyb3JzLCBoaWdobGlnaHRzIGV0Yykgd2hpY2ggaGF2ZSBjb2RlIHJlcHJlc2VudGF0aW9uLlxuICAgICAgICogVGhlIHR5cGUgaXMgcXVpdGUgc21hbGwsIHNvIGl0IHNob3VsZCBiZSB2ZXJ5IGZlYXNpYmxlIGZvciB5b3UgdG8gbWFzc2FnZSBvdGhlciBkYXRhIHRvIGZpdCBpbnRvIHRoaXMgZnVuY3Rpb25cbiAgICAgICAqL1xuICAgICAgbGlzdERpYWdzLFxuICAgICAgLyoqIFNob3dzIGEgc2luZ2xlIG9wdGlvbiBpbiBsb2NhbCBzdG9yYWdlIChhZGRzIGFuIGxpIHRvIHRoZSBjb250YWluZXIgQlRXKSAqL1xuICAgICAgbG9jYWxTdG9yYWdlT3B0aW9uLFxuICAgICAgLyoqIFVzZXMgbG9jYWxTdG9yYWdlT3B0aW9uIHRvIGNyZWF0ZSBhIGxpc3Qgb2Ygb3B0aW9ucyAqL1xuICAgICAgc2hvd09wdGlvbkxpc3QsXG4gICAgICAvKiogU2hvd3MgYSBmdWxsLXdpZHRoIHRleHQgaW5wdXQgKi9cbiAgICAgIGNyZWF0ZVRleHRJbnB1dCxcbiAgICAgIC8qKiBSZW5kZXJzIGFuIEFTVCB0cmVlICovXG4gICAgICBjcmVhdGVBU1RUcmVlLFxuICAgICAgLyoqIENyZWF0ZXMgYW4gaW5wdXQgYnV0dG9uICovXG4gICAgICBidXR0b24sXG4gICAgICAvKiogVXNlZCB0byByZS1jcmVhdGUgYSBVSSBsaWtlIHRoZSB0YWIgYmFyIGF0IHRoZSB0b3Agb2YgdGhlIHBsdWdpbnMgc2VjdGlvbiAqL1xuICAgICAgY3JlYXRlVGFiQmFyLFxuICAgICAgLyoqIFVzZWQgd2l0aCBjcmVhdGVUYWJCYXIgdG8gYWRkIGJ1dHRvbnMgKi9cbiAgICAgIGNyZWF0ZVRhYkJ1dHRvbixcbiAgICAgIC8qKiBBIGdlbmVyYWwgXCJyZXN0YXJ0IHlvdXIgYnJvd3NlclwiIG1lc3NhZ2UgICovXG4gICAgICBkZWNsYXJlUmVzdGFydFJlcXVpcmVkLFxuICAgIH1cbiAgfVxufVxuIl19