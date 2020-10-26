var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./typeAcquisition", "./theme", "./compilerOptions", "./vendor/lzstring.min", "./releases", "./getInitialCode", "./twoslashSupport", "./vendor/typescript-vfs"], function (require, exports, typeAcquisition_1, theme_1, compilerOptions_1, lzstring_min_1, releases_1, getInitialCode_1, twoslashSupport_1, tsvfs) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createTypeScriptSandbox = exports.defaultPlaygroundSettings = void 0;
    lzstring_min_1 = __importDefault(lzstring_min_1);
    tsvfs = __importStar(tsvfs);
    const languageType = (config) => (config.useJavaScript ? "javascript" : "typescript");
    // Basically android and monaco is pretty bad, this makes it less bad
    // See https://github.com/microsoft/pxt/pull/7099 for this, and the long
    // read is in https://github.com/microsoft/monaco-editor/issues/563
    const isAndroid = navigator && /android/i.test(navigator.userAgent);
    /** Default Monaco settings for playground */
    const sharedEditorOptions = {
        scrollBeyondLastLine: true,
        scrollBeyondLastColumn: 3,
        minimap: {
            enabled: false,
        },
        lightbulb: {
            enabled: true,
        },
        quickSuggestions: {
            other: !isAndroid,
            comments: !isAndroid,
            strings: !isAndroid,
        },
        acceptSuggestionOnCommitCharacter: !isAndroid,
        acceptSuggestionOnEnter: !isAndroid ? "on" : "off",
        accessibilitySupport: !isAndroid ? "on" : "off",
    };
    /** The default settings which we apply a partial over */
    function defaultPlaygroundSettings() {
        const config = {
            text: "",
            domID: "",
            compilerOptions: {},
            acquireTypes: true,
            useJavaScript: false,
            supportTwoslashCompilerOptions: false,
            logger: console,
        };
        return config;
    }
    exports.defaultPlaygroundSettings = defaultPlaygroundSettings;
    function defaultFilePath(config, compilerOptions, monaco) {
        const isJSX = compilerOptions.jsx !== monaco.languages.typescript.JsxEmit.None;
        const fileExt = config.useJavaScript ? "js" : "ts";
        const ext = isJSX ? fileExt + "x" : fileExt;
        return "input." + ext;
    }
    /** Creates a monaco file reference, basically a fancy path */
    function createFileUri(config, compilerOptions, monaco) {
        return monaco.Uri.file(defaultFilePath(config, compilerOptions, monaco));
    }
    /** Creates a sandbox editor, and returns a set of useful functions and the editor */
    exports.createTypeScriptSandbox = (partialConfig, monaco, ts) => {
        const config = Object.assign(Object.assign({}, defaultPlaygroundSettings()), partialConfig);
        if (!("domID" in config) && !("elementToAppend" in config))
            throw new Error("You did not provide a domID or elementToAppend");
        const defaultText = config.suppressAutomaticallyGettingDefaultText
            ? config.text
            : getInitialCode_1.getInitialCode(config.text, document.location);
        // Defaults
        const compilerDefaults = compilerOptions_1.getDefaultSandboxCompilerOptions(config, monaco);
        // Grab the compiler flags via the query params
        let compilerOptions;
        if (!config.suppressAutomaticallyGettingCompilerFlags) {
            const params = new URLSearchParams(location.search);
            let queryParamCompilerOptions = compilerOptions_1.getCompilerOptionsFromParams(compilerDefaults, params);
            if (Object.keys(queryParamCompilerOptions).length)
                config.logger.log("[Compiler] Found compiler options in query params: ", queryParamCompilerOptions);
            compilerOptions = Object.assign(Object.assign({}, compilerDefaults), queryParamCompilerOptions);
        }
        else {
            compilerOptions = compilerDefaults;
        }
        const language = languageType(config);
        const filePath = createFileUri(config, compilerOptions, monaco);
        const element = "domID" in config ? document.getElementById(config.domID) : config.elementToAppend;
        const model = monaco.editor.createModel(defaultText, language, filePath);
        monaco.editor.defineTheme("sandbox", theme_1.sandboxTheme);
        monaco.editor.defineTheme("sandbox-dark", theme_1.sandboxThemeDark);
        monaco.editor.setTheme("sandbox");
        const monacoSettings = Object.assign({ model }, sharedEditorOptions, config.monacoSettings || {});
        const editor = monaco.editor.create(element, monacoSettings);
        const getWorker = config.useJavaScript
            ? monaco.languages.typescript.getJavaScriptWorker
            : monaco.languages.typescript.getTypeScriptWorker;
        const defaults = config.useJavaScript
            ? monaco.languages.typescript.javascriptDefaults
            : monaco.languages.typescript.typescriptDefaults;
        defaults.setDiagnosticsOptions(Object.assign(Object.assign({}, defaults.getDiagnosticsOptions()), { noSemanticValidation: false, 
            // This is when tslib is not found
            diagnosticCodesToIgnore: [2354] }));
        // In the future it'd be good to add support for an 'add many files'
        const addLibraryToRuntime = (code, path) => {
            defaults.addExtraLib(code, path);
            const uri = monaco.Uri.file(path);
            if (monaco.editor.getModel(uri) === null) {
                monaco.editor.createModel(code, "javascript", uri);
            }
            config.logger.log(`[ATA] Adding ${path} to runtime`);
        };
        const getTwoSlashComplierOptions = twoslashSupport_1.extractTwoSlashComplierOptions(ts);
        // Then update it when the model changes, perhaps this could be a debounced plugin instead in the future?
        editor.onDidChangeModelContent(() => {
            const code = editor.getModel().getValue();
            if (config.supportTwoslashCompilerOptions) {
                const configOpts = getTwoSlashComplierOptions(code);
                updateCompilerSettings(configOpts);
            }
            if (config.acquireTypes) {
                typeAcquisition_1.detectNewImportsToAcquireTypeFor(code, addLibraryToRuntime, window.fetch.bind(window), config);
            }
        });
        config.logger.log("[Compiler] Set compiler options: ", compilerOptions);
        defaults.setCompilerOptions(compilerOptions);
        // Grab types last so that it logs in a logical way
        if (config.acquireTypes) {
            // Take the code from the editor right away
            const code = editor.getModel().getValue();
            typeAcquisition_1.detectNewImportsToAcquireTypeFor(code, addLibraryToRuntime, window.fetch.bind(window), config);
        }
        // To let clients plug into compiler settings changes
        let didUpdateCompilerSettings = (opts) => { };
        const updateCompilerSettings = (opts) => {
            const newKeys = Object.keys(opts);
            if (!newKeys.length)
                return;
            // Don't update a compiler setting if it's the same
            // as the current setting
            newKeys.forEach(key => {
                if (compilerOptions[key] == opts[key])
                    delete opts[key];
            });
            if (!Object.keys(opts).length)
                return;
            config.logger.log("[Compiler] Updating compiler options: ", opts);
            compilerOptions = Object.assign(Object.assign({}, compilerOptions), opts);
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const updateCompilerSetting = (key, value) => {
            config.logger.log("[Compiler] Setting compiler options ", key, "to", value);
            compilerOptions[key] = value;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const setCompilerSettings = (opts) => {
            config.logger.log("[Compiler] Setting compiler options: ", opts);
            compilerOptions = opts;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const getCompilerOptions = () => {
            return compilerOptions;
        };
        const setDidUpdateCompilerSettings = (func) => {
            didUpdateCompilerSettings = func;
        };
        /** Gets the results of compiling your editor's code */
        const getEmitResult = () => __awaiter(void 0, void 0, void 0, function* () {
            const model = editor.getModel();
            const client = yield getWorkerProcess();
            return yield client.getEmitOutput(model.uri.toString());
        });
        /** Gets the JS  of compiling your editor's code */
        const getRunnableJS = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            const firstJS = result.outputFiles.find((o) => o.name.endsWith(".js") || o.name.endsWith(".jsx"));
            return (firstJS && firstJS.text) || "";
        });
        /** Gets the DTS for the JS/TS  of compiling your editor's code */
        const getDTSForCode = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            return result.outputFiles.find((o) => o.name.endsWith(".d.ts")).text;
        });
        const getWorkerProcess = () => __awaiter(void 0, void 0, void 0, function* () {
            const worker = yield getWorker();
            // @ts-ignore
            return yield worker(model.uri);
        });
        const getDomNode = () => editor.getDomNode();
        const getModel = () => editor.getModel();
        const getText = () => getModel().getValue();
        const setText = (text) => getModel().setValue(text);
        const setupTSVFS = () => __awaiter(void 0, void 0, void 0, function* () {
            const fsMap = yield tsvfs.createDefaultMapFromCDN(compilerOptions, ts.version, true, ts, lzstring_min_1.default);
            fsMap.set(filePath.path, getText());
            const system = tsvfs.createSystem(fsMap);
            const host = tsvfs.createVirtualCompilerHost(system, compilerOptions, ts);
            const program = ts.createProgram({
                rootNames: [...fsMap.keys()],
                options: compilerOptions,
                host: host.compilerHost,
            });
            return {
                program,
                system,
                host,
                fsMap,
            };
        });
        /**
         * Creates a TS Program, if you're doing anything complex
         * it's likely you want setupTSVFS instead and can pull program out from that
         *
         * Warning: Runs on the main thread
         */
        const createTSProgram = () => __awaiter(void 0, void 0, void 0, function* () {
            const tsvfs = yield setupTSVFS();
            return tsvfs.program;
        });
        const getAST = () => __awaiter(void 0, void 0, void 0, function* () {
            const program = yield createTSProgram();
            program.emit();
            return program.getSourceFile(filePath.path);
        });
        // Pass along the supported releases for the playground
        const supportedVersions = releases_1.supportedReleases;
        return {
            /** The same config you passed in */
            config,
            /** A list of TypeScript versions you can use with the TypeScript sandbox */
            supportedVersions,
            /** The monaco editor instance */
            editor,
            /** Either "typescript" or "javascript" depending on your config */
            language,
            /** The outer monaco module, the result of require("monaco-editor")  */
            monaco,
            /** Gets a monaco-typescript worker, this will give you access to a language server. Note: prefer this for language server work because it happens on a webworker . */
            getWorkerProcess,
            /** A copy of require("@typescript/vfs") this can be used to quickly set up an in-memory compiler runs for ASTs, or to get complex language server results (anything above has to be serialized when passed)*/
            tsvfs,
            /** Get all the different emitted files after TypeScript is run */
            getEmitResult,
            /** Gets just the JavaScript for your sandbox, will transpile if in TS only */
            getRunnableJS,
            /** Gets the DTS output of the main code in the editor */
            getDTSForCode,
            /** The monaco-editor dom node, used for showing/hiding the editor */
            getDomNode,
            /** The model is an object which monaco uses to keep track of text in the editor. Use this to directly modify the text in the editor */
            getModel,
            /** Gets the text of the main model, which is the text in the editor */
            getText,
            /** Shortcut for setting the model's text content which would update the editor */
            setText,
            /** Gets the AST of the current text in monaco - uses `createTSProgram`, so the performance caveat applies there too */
            getAST,
            /** The module you get from require("typescript") */
            ts,
            /** Create a new Program, a TypeScript data model which represents the entire project. As well as some of the
             * primitive objects you would normally need to do work with the files.
             *
             * The first time this is called it has to download all the DTS files which is needed for an exact compiler run. Which
             * at max is about 1.5MB - after that subsequent downloads of dts lib files come from localStorage.
             *
             * Try to use this sparingly as it can be computationally expensive, at the minimum you should be using the debounced setup.
             *
             * TODO: It would be good to create an easy way to have a single program instance which is updated for you
             * when the monaco model changes.
             */
            setupTSVFS,
            /** Uses the above call setupTSVFS, but only returns the program */
            createTSProgram,
            /** The Sandbox's default compiler options  */
            compilerDefaults,
            /** The Sandbox's current compiler options */
            getCompilerOptions,
            /** Replace the Sandbox's compiler options */
            setCompilerSettings,
            /** Overwrite the Sandbox's compiler options */
            updateCompilerSetting,
            /** Update a single compiler option in the SAndbox */
            updateCompilerSettings,
            /** A way to get callbacks when compiler settings have changed */
            setDidUpdateCompilerSettings,
            /** A copy of lzstring, which is used to archive/unarchive code */
            lzstring: lzstring_min_1.default,
            /** Returns compiler options found in the params of the current page */
            createURLQueryWithCompilerOptions: compilerOptions_1.createURLQueryWithCompilerOptions,
            /** Returns compiler options in the source code using twoslash notation */
            getTwoSlashComplierOptions,
            /** Gets to the current monaco-language, this is how you talk to the background webworkers */
            languageServiceDefaults: defaults,
            /** The path which represents the current file using the current compiler options */
            filepath: filePath.path,
        };
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zYW5kYm94L3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBa0RBLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBd0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRXZHLHFFQUFxRTtJQUNyRSx3RUFBd0U7SUFDeEUsbUVBQW1FO0lBQ25FLE1BQU0sU0FBUyxHQUFHLFNBQVMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUVuRSw2Q0FBNkM7SUFDN0MsTUFBTSxtQkFBbUIsR0FBa0Q7UUFDekUsb0JBQW9CLEVBQUUsSUFBSTtRQUMxQixzQkFBc0IsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sRUFBRTtZQUNQLE9BQU8sRUFBRSxLQUFLO1NBQ2Y7UUFDRCxTQUFTLEVBQUU7WUFDVCxPQUFPLEVBQUUsSUFBSTtTQUNkO1FBQ0QsZ0JBQWdCLEVBQUU7WUFDaEIsS0FBSyxFQUFFLENBQUMsU0FBUztZQUNqQixRQUFRLEVBQUUsQ0FBQyxTQUFTO1lBQ3BCLE9BQU8sRUFBRSxDQUFDLFNBQVM7U0FDcEI7UUFDRCxpQ0FBaUMsRUFBRSxDQUFDLFNBQVM7UUFDN0MsdUJBQXVCLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSztRQUNsRCxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLO0tBQ2hELENBQUE7SUFFRCx5REFBeUQ7SUFDekQsU0FBZ0IseUJBQXlCO1FBQ3ZDLE1BQU0sTUFBTSxHQUFxQjtZQUMvQixJQUFJLEVBQUUsRUFBRTtZQUNSLEtBQUssRUFBRSxFQUFFO1lBQ1QsZUFBZSxFQUFFLEVBQUU7WUFDbkIsWUFBWSxFQUFFLElBQUk7WUFDbEIsYUFBYSxFQUFFLEtBQUs7WUFDcEIsOEJBQThCLEVBQUUsS0FBSztZQUNyQyxNQUFNLEVBQUUsT0FBTztTQUNoQixDQUFBO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZixDQUFDO0lBWEQsOERBV0M7SUFFRCxTQUFTLGVBQWUsQ0FBQyxNQUF3QixFQUFFLGVBQWdDLEVBQUUsTUFBYztRQUNqRyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsR0FBRyxLQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDOUUsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDbEQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFDM0MsT0FBTyxRQUFRLEdBQUcsR0FBRyxDQUFBO0lBQ3ZCLENBQUM7SUFFRCw4REFBOEQ7SUFDOUQsU0FBUyxhQUFhLENBQUMsTUFBd0IsRUFBRSxlQUFnQyxFQUFFLE1BQWM7UUFDL0YsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFRCxxRkFBcUY7SUFDeEUsUUFBQSx1QkFBdUIsR0FBRyxDQUNyQyxhQUF3QyxFQUN4QyxNQUFjLEVBQ2QsRUFBK0IsRUFDL0IsRUFBRTtRQUNGLE1BQU0sTUFBTSxtQ0FBUSx5QkFBeUIsRUFBRSxHQUFLLGFBQWEsQ0FBRSxDQUFBO1FBQ25FLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsaUJBQWlCLElBQUksTUFBTSxDQUFDO1lBQ3hELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQTtRQUVuRSxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsdUNBQXVDO1lBQ2hFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtZQUNiLENBQUMsQ0FBQywrQkFBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxELFdBQVc7UUFDWCxNQUFNLGdCQUFnQixHQUFHLGtEQUFnQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUV6RSwrQ0FBK0M7UUFDL0MsSUFBSSxlQUFnQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMseUNBQXlDLEVBQUU7WUFDckQsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ25ELElBQUkseUJBQXlCLEdBQUcsOENBQTRCLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEYsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsTUFBTTtnQkFDL0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMscURBQXFELEVBQUUseUJBQXlCLENBQUMsQ0FBQTtZQUNyRyxlQUFlLG1DQUFRLGdCQUFnQixHQUFLLHlCQUF5QixDQUFFLENBQUE7U0FDeEU7YUFBTTtZQUNMLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQTtTQUNuQztRQUVELE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyQyxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMvRCxNQUFNLE9BQU8sR0FBRyxPQUFPLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUUsTUFBYyxDQUFDLGVBQWUsQ0FBQTtRQUUzRyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxvQkFBWSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLHdCQUFnQixDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFakMsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFDLENBQUE7UUFDakcsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRTVELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxhQUFhO1lBQ3BDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7WUFDakQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFBO1FBRW5ELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxhQUFhO1lBQ25DLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0I7WUFDaEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFBO1FBRWxELFFBQVEsQ0FBQyxxQkFBcUIsaUNBQ3pCLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxLQUNuQyxvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLGtDQUFrQztZQUNsQyx1QkFBdUIsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUMvQixDQUFBO1FBRUYsb0VBQW9FO1FBQ3BFLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxJQUFZLEVBQUUsSUFBWSxFQUFFLEVBQUU7WUFDekQsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDaEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDakMsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hDLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7YUFDbkQ7WUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSxhQUFhLENBQUMsQ0FBQTtRQUN0RCxDQUFDLENBQUE7UUFFRCxNQUFNLDBCQUEwQixHQUFHLGdEQUE4QixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXJFLHlHQUF5RztRQUN6RyxNQUFNLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ2xDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUUxQyxJQUFJLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRTtnQkFDekMsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ25ELHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFBO2FBQ25DO1lBRUQsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO2dCQUN2QixrREFBZ0MsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7YUFDL0Y7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3ZFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUU1QyxtREFBbUQ7UUFDbkQsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3ZCLDJDQUEyQztZQUMzQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDMUMsa0RBQWdDLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1NBQy9GO1FBRUQscURBQXFEO1FBQ3JELElBQUkseUJBQXlCLEdBQUcsQ0FBQyxJQUFxQixFQUFFLEVBQUUsR0FBRSxDQUFDLENBQUE7UUFFN0QsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLElBQXFCLEVBQUUsRUFBRTtZQUN2RCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTTtnQkFBRSxPQUFNO1lBRTNCLG1EQUFtRDtZQUNuRCx5QkFBeUI7WUFDekIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDcEIsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQztvQkFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN6RCxDQUFDLENBQUMsQ0FBQTtZQUVGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU07Z0JBQUUsT0FBTTtZQUVyQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUVqRSxlQUFlLG1DQUFRLGVBQWUsR0FBSyxJQUFJLENBQUUsQ0FBQTtZQUNqRCxRQUFRLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDNUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDNUMsQ0FBQyxDQUFBO1FBRUQsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLEdBQTBCLEVBQUUsS0FBVSxFQUFFLEVBQUU7WUFDdkUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMzRSxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFBO1lBQzVCLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM1Qyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUM1QyxDQUFDLENBQUE7UUFFRCxNQUFNLG1CQUFtQixHQUFHLENBQUMsSUFBcUIsRUFBRSxFQUFFO1lBQ3BELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2hFLGVBQWUsR0FBRyxJQUFJLENBQUE7WUFDdEIsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzVDLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzVDLENBQUMsQ0FBQTtRQUVELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO1lBQzlCLE9BQU8sZUFBZSxDQUFBO1FBQ3hCLENBQUMsQ0FBQTtRQUVELE1BQU0sNEJBQTRCLEdBQUcsQ0FBQyxJQUFxQyxFQUFFLEVBQUU7WUFDN0UseUJBQXlCLEdBQUcsSUFBSSxDQUFBO1FBQ2xDLENBQUMsQ0FBQTtRQUVELHVEQUF1RDtRQUN2RCxNQUFNLGFBQWEsR0FBRyxHQUFTLEVBQUU7WUFDL0IsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFBO1lBRWhDLE1BQU0sTUFBTSxHQUFHLE1BQU0sZ0JBQWdCLEVBQUUsQ0FBQTtZQUN2QyxPQUFPLE1BQU0sTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDekQsQ0FBQyxDQUFBLENBQUE7UUFFRCxtREFBbUQ7UUFDbkQsTUFBTSxhQUFhLEdBQUcsR0FBUyxFQUFFO1lBQy9CLE1BQU0sTUFBTSxHQUFHLE1BQU0sYUFBYSxFQUFFLENBQUE7WUFDcEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDdEcsT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3hDLENBQUMsQ0FBQSxDQUFBO1FBRUQsa0VBQWtFO1FBQ2xFLE1BQU0sYUFBYSxHQUFHLEdBQVMsRUFBRTtZQUMvQixNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFBO1lBQ3BDLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFFLENBQUMsSUFBSSxDQUFBO1FBQzVFLENBQUMsQ0FBQSxDQUFBO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxHQUFvQyxFQUFFO1lBQzdELE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxFQUFFLENBQUE7WUFDaEMsYUFBYTtZQUNiLE9BQU8sTUFBTSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hDLENBQUMsQ0FBQSxDQUFBO1FBRUQsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRyxDQUFBO1FBQzdDLE1BQU0sUUFBUSxHQUFHLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtRQUN6QyxNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMzQyxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRTNELE1BQU0sVUFBVSxHQUFHLEdBQVMsRUFBRTtZQUM1QixNQUFNLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLHNCQUFRLENBQUMsQ0FBQTtZQUNsRyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUVuQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3hDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBRXpFLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUM7Z0JBQy9CLFNBQVMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM1QixPQUFPLEVBQUUsZUFBZTtnQkFDeEIsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZO2FBQ3hCLENBQUMsQ0FBQTtZQUVGLE9BQU87Z0JBQ0wsT0FBTztnQkFDUCxNQUFNO2dCQUNOLElBQUk7Z0JBQ0osS0FBSzthQUNOLENBQUE7UUFDSCxDQUFDLENBQUEsQ0FBQTtRQUVEOzs7OztXQUtHO1FBQ0gsTUFBTSxlQUFlLEdBQUcsR0FBUyxFQUFFO1lBQ2pDLE1BQU0sS0FBSyxHQUFHLE1BQU0sVUFBVSxFQUFFLENBQUE7WUFDaEMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFBO1FBQ3RCLENBQUMsQ0FBQSxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsR0FBUyxFQUFFO1lBQ3hCLE1BQU0sT0FBTyxHQUFHLE1BQU0sZUFBZSxFQUFFLENBQUE7WUFDdkMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ2QsT0FBTyxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUUsQ0FBQTtRQUM5QyxDQUFDLENBQUEsQ0FBQTtRQUVELHVEQUF1RDtRQUN2RCxNQUFNLGlCQUFpQixHQUFHLDRCQUFpQixDQUFBO1FBRTNDLE9BQU87WUFDTCxvQ0FBb0M7WUFDcEMsTUFBTTtZQUNOLDRFQUE0RTtZQUM1RSxpQkFBaUI7WUFDakIsaUNBQWlDO1lBQ2pDLE1BQU07WUFDTixtRUFBbUU7WUFDbkUsUUFBUTtZQUNSLHVFQUF1RTtZQUN2RSxNQUFNO1lBQ04sc0tBQXNLO1lBQ3RLLGdCQUFnQjtZQUNoQiw4TUFBOE07WUFDOU0sS0FBSztZQUNMLGtFQUFrRTtZQUNsRSxhQUFhO1lBQ2IsOEVBQThFO1lBQzlFLGFBQWE7WUFDYix5REFBeUQ7WUFDekQsYUFBYTtZQUNiLHFFQUFxRTtZQUNyRSxVQUFVO1lBQ1YsdUlBQXVJO1lBQ3ZJLFFBQVE7WUFDUix1RUFBdUU7WUFDdkUsT0FBTztZQUNQLGtGQUFrRjtZQUNsRixPQUFPO1lBQ1AsdUhBQXVIO1lBQ3ZILE1BQU07WUFDTixvREFBb0Q7WUFDcEQsRUFBRTtZQUNGOzs7Ozs7Ozs7O2VBVUc7WUFDSCxVQUFVO1lBQ1YsbUVBQW1FO1lBQ25FLGVBQWU7WUFDZiw4Q0FBOEM7WUFDOUMsZ0JBQWdCO1lBQ2hCLDZDQUE2QztZQUM3QyxrQkFBa0I7WUFDbEIsNkNBQTZDO1lBQzdDLG1CQUFtQjtZQUNuQiwrQ0FBK0M7WUFDL0MscUJBQXFCO1lBQ3JCLHFEQUFxRDtZQUNyRCxzQkFBc0I7WUFDdEIsaUVBQWlFO1lBQ2pFLDRCQUE0QjtZQUM1QixrRUFBa0U7WUFDbEUsUUFBUSxFQUFSLHNCQUFRO1lBQ1IsdUVBQXVFO1lBQ3ZFLGlDQUFpQyxFQUFqQyxtREFBaUM7WUFDakMsMEVBQTBFO1lBQzFFLDBCQUEwQjtZQUMxQiw2RkFBNkY7WUFDN0YsdUJBQXVCLEVBQUUsUUFBUTtZQUNqQyxvRkFBb0Y7WUFDcEYsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO1NBQ3hCLENBQUE7SUFDSCxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZXRlY3ROZXdJbXBvcnRzVG9BY3F1aXJlVHlwZUZvciB9IGZyb20gXCIuL3R5cGVBY3F1aXNpdGlvblwiXG5pbXBvcnQgeyBzYW5kYm94VGhlbWUsIHNhbmRib3hUaGVtZURhcmsgfSBmcm9tIFwiLi90aGVtZVwiXG5pbXBvcnQgeyBUeXBlU2NyaXB0V29ya2VyIH0gZnJvbSBcIi4vdHNXb3JrZXJcIlxuaW1wb3J0IHtcbiAgZ2V0RGVmYXVsdFNhbmRib3hDb21waWxlck9wdGlvbnMsXG4gIGdldENvbXBpbGVyT3B0aW9uc0Zyb21QYXJhbXMsXG4gIGNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyxcbn0gZnJvbSBcIi4vY29tcGlsZXJPcHRpb25zXCJcbmltcG9ydCBsenN0cmluZyBmcm9tIFwiLi92ZW5kb3IvbHpzdHJpbmcubWluXCJcbmltcG9ydCB7IHN1cHBvcnRlZFJlbGVhc2VzIH0gZnJvbSBcIi4vcmVsZWFzZXNcIlxuaW1wb3J0IHsgZ2V0SW5pdGlhbENvZGUgfSBmcm9tIFwiLi9nZXRJbml0aWFsQ29kZVwiXG5pbXBvcnQgeyBleHRyYWN0VHdvU2xhc2hDb21wbGllck9wdGlvbnMgfSBmcm9tIFwiLi90d29zbGFzaFN1cHBvcnRcIlxuaW1wb3J0ICogYXMgdHN2ZnMgZnJvbSBcIi4vdmVuZG9yL3R5cGVzY3JpcHQtdmZzXCJcblxudHlwZSBDb21waWxlck9wdGlvbnMgPSBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmxhbmd1YWdlcy50eXBlc2NyaXB0LkNvbXBpbGVyT3B0aW9uc1xudHlwZSBNb25hY28gPSB0eXBlb2YgaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKVxuXG4vKipcbiAqIFRoZXNlIGFyZSBzZXR0aW5ncyBmb3IgdGhlIHBsYXlncm91bmQgd2hpY2ggYXJlIHRoZSBlcXVpdmFsZW50IHRvIHByb3BzIGluIFJlYWN0XG4gKiBhbnkgY2hhbmdlcyB0byBpdCBzaG91bGQgcmVxdWlyZSBhIG5ldyBzZXR1cCBvZiB0aGUgcGxheWdyb3VuZFxuICovXG5leHBvcnQgdHlwZSBQbGF5Z3JvdW5kQ29uZmlnID0ge1xuICAvKiogVGhlIGRlZmF1bHQgc291cmNlIGNvZGUgZm9yIHRoZSBwbGF5Z3JvdW5kICovXG4gIHRleHQ6IHN0cmluZ1xuICAvKiogU2hvdWxkIGl0IHJ1biB0aGUgdHMgb3IganMgSURFIHNlcnZpY2VzICovXG4gIHVzZUphdmFTY3JpcHQ6IGJvb2xlYW5cbiAgLyoqIENvbXBpbGVyIG9wdGlvbnMgd2hpY2ggYXJlIGF1dG9tYXRpY2FsbHkganVzdCBmb3J3YXJkZWQgb24gKi9cbiAgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnNcbiAgLyoqIE9wdGlvbmFsIG1vbmFjbyBzZXR0aW5ncyBvdmVycmlkZXMgKi9cbiAgbW9uYWNvU2V0dGluZ3M/OiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmVkaXRvci5JRWRpdG9yT3B0aW9uc1xuICAvKiogQWNxdWlyZSB0eXBlcyB2aWEgdHlwZSBhY3F1aXNpdGlvbiAqL1xuICBhY3F1aXJlVHlwZXM6IGJvb2xlYW5cbiAgLyoqIFN1cHBvcnQgdHdvc2xhc2ggY29tcGlsZXIgb3B0aW9ucyAqL1xuICBzdXBwb3J0VHdvc2xhc2hDb21waWxlck9wdGlvbnM6IGJvb2xlYW5cbiAgLyoqIEdldCB0aGUgdGV4dCB2aWEgcXVlcnkgcGFyYW1zIGFuZCBsb2NhbCBzdG9yYWdlLCB1c2VmdWwgd2hlbiB0aGUgZWRpdG9yIGlzIHRoZSBtYWluIGV4cGVyaWVuY2UgKi9cbiAgc3VwcHJlc3NBdXRvbWF0aWNhbGx5R2V0dGluZ0RlZmF1bHRUZXh0PzogdHJ1ZVxuICAvKiogU3VwcHJlc3Mgc2V0dGluZyBjb21waWxlciBvcHRpb25zIGZyb20gdGhlIGNvbXBpbGVyIGZsYWdzIGZyb20gcXVlcnkgcGFyYW1zICovXG4gIHN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdDb21waWxlckZsYWdzPzogdHJ1ZVxuICAvKiogTG9nZ2luZyBzeXN0ZW0gKi9cbiAgbG9nZ2VyOiB7XG4gICAgbG9nOiAoLi4uYXJnczogYW55W10pID0+IHZvaWRcbiAgICBlcnJvcjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gICAgZ3JvdXBDb2xsYXBzZWQ6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICAgIGdyb3VwRW5kOiAoLi4uYXJnczogYW55W10pID0+IHZvaWRcbiAgfVxufSAmIChcbiAgfCB7IC8qKiB0aGVJRCBvZiBhIGRvbSBub2RlIHRvIGFkZCBtb25hY28gdG8gKi8gZG9tSUQ6IHN0cmluZyB9XG4gIHwgeyAvKiogdGhlSUQgb2YgYSBkb20gbm9kZSB0byBhZGQgbW9uYWNvIHRvICovIGVsZW1lbnRUb0FwcGVuZDogSFRNTEVsZW1lbnQgfVxuKVxuXG5jb25zdCBsYW5ndWFnZVR5cGUgPSAoY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnKSA9PiAoY29uZmlnLnVzZUphdmFTY3JpcHQgPyBcImphdmFzY3JpcHRcIiA6IFwidHlwZXNjcmlwdFwiKVxuXG4vLyBCYXNpY2FsbHkgYW5kcm9pZCBhbmQgbW9uYWNvIGlzIHByZXR0eSBiYWQsIHRoaXMgbWFrZXMgaXQgbGVzcyBiYWRcbi8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L3B4dC9wdWxsLzcwOTkgZm9yIHRoaXMsIGFuZCB0aGUgbG9uZ1xuLy8gcmVhZCBpcyBpbiBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L21vbmFjby1lZGl0b3IvaXNzdWVzLzU2M1xuY29uc3QgaXNBbmRyb2lkID0gbmF2aWdhdG9yICYmIC9hbmRyb2lkL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KVxuXG4vKiogRGVmYXVsdCBNb25hY28gc2V0dGluZ3MgZm9yIHBsYXlncm91bmQgKi9cbmNvbnN0IHNoYXJlZEVkaXRvck9wdGlvbnM6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuZWRpdG9yLklFZGl0b3JPcHRpb25zID0ge1xuICBzY3JvbGxCZXlvbmRMYXN0TGluZTogdHJ1ZSxcbiAgc2Nyb2xsQmV5b25kTGFzdENvbHVtbjogMyxcbiAgbWluaW1hcDoge1xuICAgIGVuYWJsZWQ6IGZhbHNlLFxuICB9LFxuICBsaWdodGJ1bGI6IHtcbiAgICBlbmFibGVkOiB0cnVlLFxuICB9LFxuICBxdWlja1N1Z2dlc3Rpb25zOiB7XG4gICAgb3RoZXI6ICFpc0FuZHJvaWQsXG4gICAgY29tbWVudHM6ICFpc0FuZHJvaWQsXG4gICAgc3RyaW5nczogIWlzQW5kcm9pZCxcbiAgfSxcbiAgYWNjZXB0U3VnZ2VzdGlvbk9uQ29tbWl0Q2hhcmFjdGVyOiAhaXNBbmRyb2lkLFxuICBhY2NlcHRTdWdnZXN0aW9uT25FbnRlcjogIWlzQW5kcm9pZCA/IFwib25cIiA6IFwib2ZmXCIsXG4gIGFjY2Vzc2liaWxpdHlTdXBwb3J0OiAhaXNBbmRyb2lkID8gXCJvblwiIDogXCJvZmZcIixcbn1cblxuLyoqIFRoZSBkZWZhdWx0IHNldHRpbmdzIHdoaWNoIHdlIGFwcGx5IGEgcGFydGlhbCBvdmVyICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFBsYXlncm91bmRTZXR0aW5ncygpIHtcbiAgY29uc3QgY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnID0ge1xuICAgIHRleHQ6IFwiXCIsXG4gICAgZG9tSUQ6IFwiXCIsXG4gICAgY29tcGlsZXJPcHRpb25zOiB7fSxcbiAgICBhY3F1aXJlVHlwZXM6IHRydWUsXG4gICAgdXNlSmF2YVNjcmlwdDogZmFsc2UsXG4gICAgc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zOiBmYWxzZSxcbiAgICBsb2dnZXI6IGNvbnNvbGUsXG4gIH1cbiAgcmV0dXJuIGNvbmZpZ1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0RmlsZVBhdGgoY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnLCBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgbW9uYWNvOiBNb25hY28pIHtcbiAgY29uc3QgaXNKU1ggPSBjb21waWxlck9wdGlvbnMuanN4ICE9PSBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuSnN4RW1pdC5Ob25lXG4gIGNvbnN0IGZpbGVFeHQgPSBjb25maWcudXNlSmF2YVNjcmlwdCA/IFwianNcIiA6IFwidHNcIlxuICBjb25zdCBleHQgPSBpc0pTWCA/IGZpbGVFeHQgKyBcInhcIiA6IGZpbGVFeHRcbiAgcmV0dXJuIFwiaW5wdXQuXCIgKyBleHRcbn1cblxuLyoqIENyZWF0ZXMgYSBtb25hY28gZmlsZSByZWZlcmVuY2UsIGJhc2ljYWxseSBhIGZhbmN5IHBhdGggKi9cbmZ1bmN0aW9uIGNyZWF0ZUZpbGVVcmkoY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnLCBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgbW9uYWNvOiBNb25hY28pIHtcbiAgcmV0dXJuIG1vbmFjby5VcmkuZmlsZShkZWZhdWx0RmlsZVBhdGgoY29uZmlnLCBjb21waWxlck9wdGlvbnMsIG1vbmFjbykpXG59XG5cbi8qKiBDcmVhdGVzIGEgc2FuZGJveCBlZGl0b3IsIGFuZCByZXR1cm5zIGEgc2V0IG9mIHVzZWZ1bCBmdW5jdGlvbnMgYW5kIHRoZSBlZGl0b3IgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVUeXBlU2NyaXB0U2FuZGJveCA9IChcbiAgcGFydGlhbENvbmZpZzogUGFydGlhbDxQbGF5Z3JvdW5kQ29uZmlnPixcbiAgbW9uYWNvOiBNb25hY28sXG4gIHRzOiB0eXBlb2YgaW1wb3J0KFwidHlwZXNjcmlwdFwiKVxuKSA9PiB7XG4gIGNvbnN0IGNvbmZpZyA9IHsgLi4uZGVmYXVsdFBsYXlncm91bmRTZXR0aW5ncygpLCAuLi5wYXJ0aWFsQ29uZmlnIH1cbiAgaWYgKCEoXCJkb21JRFwiIGluIGNvbmZpZykgJiYgIShcImVsZW1lbnRUb0FwcGVuZFwiIGluIGNvbmZpZykpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiWW91IGRpZCBub3QgcHJvdmlkZSBhIGRvbUlEIG9yIGVsZW1lbnRUb0FwcGVuZFwiKVxuXG4gIGNvbnN0IGRlZmF1bHRUZXh0ID0gY29uZmlnLnN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdEZWZhdWx0VGV4dFxuICAgID8gY29uZmlnLnRleHRcbiAgICA6IGdldEluaXRpYWxDb2RlKGNvbmZpZy50ZXh0LCBkb2N1bWVudC5sb2NhdGlvbilcblxuICAvLyBEZWZhdWx0c1xuICBjb25zdCBjb21waWxlckRlZmF1bHRzID0gZ2V0RGVmYXVsdFNhbmRib3hDb21waWxlck9wdGlvbnMoY29uZmlnLCBtb25hY28pXG5cbiAgLy8gR3JhYiB0aGUgY29tcGlsZXIgZmxhZ3MgdmlhIHRoZSBxdWVyeSBwYXJhbXNcbiAgbGV0IGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zXG4gIGlmICghY29uZmlnLnN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdDb21waWxlckZsYWdzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpXG4gICAgbGV0IHF1ZXJ5UGFyYW1Db21waWxlck9wdGlvbnMgPSBnZXRDb21waWxlck9wdGlvbnNGcm9tUGFyYW1zKGNvbXBpbGVyRGVmYXVsdHMsIHBhcmFtcylcbiAgICBpZiAoT2JqZWN0LmtleXMocXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucykubGVuZ3RoKVxuICAgICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIEZvdW5kIGNvbXBpbGVyIG9wdGlvbnMgaW4gcXVlcnkgcGFyYW1zOiBcIiwgcXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucylcbiAgICBjb21waWxlck9wdGlvbnMgPSB7IC4uLmNvbXBpbGVyRGVmYXVsdHMsIC4uLnF1ZXJ5UGFyYW1Db21waWxlck9wdGlvbnMgfVxuICB9IGVsc2Uge1xuICAgIGNvbXBpbGVyT3B0aW9ucyA9IGNvbXBpbGVyRGVmYXVsdHNcbiAgfVxuXG4gIGNvbnN0IGxhbmd1YWdlID0gbGFuZ3VhZ2VUeXBlKGNvbmZpZylcbiAgY29uc3QgZmlsZVBhdGggPSBjcmVhdGVGaWxlVXJpKGNvbmZpZywgY29tcGlsZXJPcHRpb25zLCBtb25hY28pXG4gIGNvbnN0IGVsZW1lbnQgPSBcImRvbUlEXCIgaW4gY29uZmlnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29uZmlnLmRvbUlEKSA6IChjb25maWcgYXMgYW55KS5lbGVtZW50VG9BcHBlbmRcblxuICBjb25zdCBtb2RlbCA9IG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoZGVmYXVsdFRleHQsIGxhbmd1YWdlLCBmaWxlUGF0aClcbiAgbW9uYWNvLmVkaXRvci5kZWZpbmVUaGVtZShcInNhbmRib3hcIiwgc2FuZGJveFRoZW1lKVxuICBtb25hY28uZWRpdG9yLmRlZmluZVRoZW1lKFwic2FuZGJveC1kYXJrXCIsIHNhbmRib3hUaGVtZURhcmspXG4gIG1vbmFjby5lZGl0b3Iuc2V0VGhlbWUoXCJzYW5kYm94XCIpXG5cbiAgY29uc3QgbW9uYWNvU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbW9kZWwgfSwgc2hhcmVkRWRpdG9yT3B0aW9ucywgY29uZmlnLm1vbmFjb1NldHRpbmdzIHx8IHt9KVxuICBjb25zdCBlZGl0b3IgPSBtb25hY28uZWRpdG9yLmNyZWF0ZShlbGVtZW50LCBtb25hY29TZXR0aW5ncylcblxuICBjb25zdCBnZXRXb3JrZXIgPSBjb25maWcudXNlSmF2YVNjcmlwdFxuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmdldEphdmFTY3JpcHRXb3JrZXJcbiAgICA6IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5nZXRUeXBlU2NyaXB0V29ya2VyXG5cbiAgY29uc3QgZGVmYXVsdHMgPSBjb25maWcudXNlSmF2YVNjcmlwdFxuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmphdmFzY3JpcHREZWZhdWx0c1xuICAgIDogbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LnR5cGVzY3JpcHREZWZhdWx0c1xuXG4gIGRlZmF1bHRzLnNldERpYWdub3N0aWNzT3B0aW9ucyh7XG4gICAgLi4uZGVmYXVsdHMuZ2V0RGlhZ25vc3RpY3NPcHRpb25zKCksXG4gICAgbm9TZW1hbnRpY1ZhbGlkYXRpb246IGZhbHNlLFxuICAgIC8vIFRoaXMgaXMgd2hlbiB0c2xpYiBpcyBub3QgZm91bmRcbiAgICBkaWFnbm9zdGljQ29kZXNUb0lnbm9yZTogWzIzNTRdLFxuICB9KVxuXG4gIC8vIEluIHRoZSBmdXR1cmUgaXQnZCBiZSBnb29kIHRvIGFkZCBzdXBwb3J0IGZvciBhbiAnYWRkIG1hbnkgZmlsZXMnXG4gIGNvbnN0IGFkZExpYnJhcnlUb1J1bnRpbWUgPSAoY29kZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+IHtcbiAgICBkZWZhdWx0cy5hZGRFeHRyYUxpYihjb2RlLCBwYXRoKVxuICAgIGNvbnN0IHVyaSA9IG1vbmFjby5VcmkuZmlsZShwYXRoKVxuICAgIGlmIChtb25hY28uZWRpdG9yLmdldE1vZGVsKHVyaSkgPT09IG51bGwpIHtcbiAgICAgIG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoY29kZSwgXCJqYXZhc2NyaXB0XCIsIHVyaSlcbiAgICB9XG4gICAgY29uZmlnLmxvZ2dlci5sb2coYFtBVEFdIEFkZGluZyAke3BhdGh9IHRvIHJ1bnRpbWVgKVxuICB9XG5cbiAgY29uc3QgZ2V0VHdvU2xhc2hDb21wbGllck9wdGlvbnMgPSBleHRyYWN0VHdvU2xhc2hDb21wbGllck9wdGlvbnModHMpXG5cbiAgLy8gVGhlbiB1cGRhdGUgaXQgd2hlbiB0aGUgbW9kZWwgY2hhbmdlcywgcGVyaGFwcyB0aGlzIGNvdWxkIGJlIGEgZGVib3VuY2VkIHBsdWdpbiBpbnN0ZWFkIGluIHRoZSBmdXR1cmU/XG4gIGVkaXRvci5vbkRpZENoYW5nZU1vZGVsQ29udGVudCgoKSA9PiB7XG4gICAgY29uc3QgY29kZSA9IGVkaXRvci5nZXRNb2RlbCgpIS5nZXRWYWx1ZSgpXG5cbiAgICBpZiAoY29uZmlnLnN1cHBvcnRUd29zbGFzaENvbXBpbGVyT3B0aW9ucykge1xuICAgICAgY29uc3QgY29uZmlnT3B0cyA9IGdldFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zKGNvZGUpXG4gICAgICB1cGRhdGVDb21waWxlclNldHRpbmdzKGNvbmZpZ09wdHMpXG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5hY3F1aXJlVHlwZXMpIHtcbiAgICAgIGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yKGNvZGUsIGFkZExpYnJhcnlUb1J1bnRpbWUsIHdpbmRvdy5mZXRjaC5iaW5kKHdpbmRvdyksIGNvbmZpZylcbiAgICB9XG4gIH0pXG5cbiAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIFNldCBjb21waWxlciBvcHRpb25zOiBcIiwgY29tcGlsZXJPcHRpb25zKVxuICBkZWZhdWx0cy5zZXRDb21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zKVxuXG4gIC8vIEdyYWIgdHlwZXMgbGFzdCBzbyB0aGF0IGl0IGxvZ3MgaW4gYSBsb2dpY2FsIHdheVxuICBpZiAoY29uZmlnLmFjcXVpcmVUeXBlcykge1xuICAgIC8vIFRha2UgdGhlIGNvZGUgZnJvbSB0aGUgZWRpdG9yIHJpZ2h0IGF3YXlcbiAgICBjb25zdCBjb2RlID0gZWRpdG9yLmdldE1vZGVsKCkhLmdldFZhbHVlKClcbiAgICBkZXRlY3ROZXdJbXBvcnRzVG9BY3F1aXJlVHlwZUZvcihjb2RlLCBhZGRMaWJyYXJ5VG9SdW50aW1lLCB3aW5kb3cuZmV0Y2guYmluZCh3aW5kb3cpLCBjb25maWcpXG4gIH1cblxuICAvLyBUbyBsZXQgY2xpZW50cyBwbHVnIGludG8gY29tcGlsZXIgc2V0dGluZ3MgY2hhbmdlc1xuICBsZXQgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IChvcHRzOiBDb21waWxlck9wdGlvbnMpID0+IHt9XG5cbiAgY29uc3QgdXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IChvcHRzOiBDb21waWxlck9wdGlvbnMpID0+IHtcbiAgICBjb25zdCBuZXdLZXlzID0gT2JqZWN0LmtleXMob3B0cylcbiAgICBpZiAoIW5ld0tleXMubGVuZ3RoKSByZXR1cm5cblxuICAgIC8vIERvbid0IHVwZGF0ZSBhIGNvbXBpbGVyIHNldHRpbmcgaWYgaXQncyB0aGUgc2FtZVxuICAgIC8vIGFzIHRoZSBjdXJyZW50IHNldHRpbmdcbiAgICBuZXdLZXlzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGlmIChjb21waWxlck9wdGlvbnNba2V5XSA9PSBvcHRzW2tleV0pIGRlbGV0ZSBvcHRzW2tleV1cbiAgICB9KVxuXG4gICAgaWYgKCFPYmplY3Qua2V5cyhvcHRzKS5sZW5ndGgpIHJldHVyblxuXG4gICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIFVwZGF0aW5nIGNvbXBpbGVyIG9wdGlvbnM6IFwiLCBvcHRzKVxuXG4gICAgY29tcGlsZXJPcHRpb25zID0geyAuLi5jb21waWxlck9wdGlvbnMsIC4uLm9wdHMgfVxuICAgIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb21waWxlck9wdGlvbnMpXG4gIH1cblxuICBjb25zdCB1cGRhdGVDb21waWxlclNldHRpbmcgPSAoa2V5OiBrZXlvZiBDb21waWxlck9wdGlvbnMsIHZhbHVlOiBhbnkpID0+IHtcbiAgICBjb25maWcubG9nZ2VyLmxvZyhcIltDb21waWxlcl0gU2V0dGluZyBjb21waWxlciBvcHRpb25zIFwiLCBrZXksIFwidG9cIiwgdmFsdWUpXG4gICAgY29tcGlsZXJPcHRpb25zW2tleV0gPSB2YWx1ZVxuICAgIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb21waWxlck9wdGlvbnMpXG4gIH1cblxuICBjb25zdCBzZXRDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge1xuICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiW0NvbXBpbGVyXSBTZXR0aW5nIGNvbXBpbGVyIG9wdGlvbnM6IFwiLCBvcHRzKVxuICAgIGNvbXBpbGVyT3B0aW9ucyA9IG9wdHNcbiAgICBkZWZhdWx0cy5zZXRDb21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zKVxuICAgIGRpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MoY29tcGlsZXJPcHRpb25zKVxuICB9XG5cbiAgY29uc3QgZ2V0Q29tcGlsZXJPcHRpb25zID0gKCkgPT4ge1xuICAgIHJldHVybiBjb21waWxlck9wdGlvbnNcbiAgfVxuXG4gIGNvbnN0IHNldERpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MgPSAoZnVuYzogKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4gdm9pZCkgPT4ge1xuICAgIGRpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MgPSBmdW5jXG4gIH1cblxuICAvKiogR2V0cyB0aGUgcmVzdWx0cyBvZiBjb21waWxpbmcgeW91ciBlZGl0b3IncyBjb2RlICovXG4gIGNvbnN0IGdldEVtaXRSZXN1bHQgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgbW9kZWwgPSBlZGl0b3IuZ2V0TW9kZWwoKSFcblxuICAgIGNvbnN0IGNsaWVudCA9IGF3YWl0IGdldFdvcmtlclByb2Nlc3MoKVxuICAgIHJldHVybiBhd2FpdCBjbGllbnQuZ2V0RW1pdE91dHB1dChtb2RlbC51cmkudG9TdHJpbmcoKSlcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBKUyAgb2YgY29tcGlsaW5nIHlvdXIgZWRpdG9yJ3MgY29kZSAqL1xuICBjb25zdCBnZXRSdW5uYWJsZUpTID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldEVtaXRSZXN1bHQoKVxuICAgIGNvbnN0IGZpcnN0SlMgPSByZXN1bHQub3V0cHV0RmlsZXMuZmluZCgobzogYW55KSA9PiBvLm5hbWUuZW5kc1dpdGgoXCIuanNcIikgfHwgby5uYW1lLmVuZHNXaXRoKFwiLmpzeFwiKSlcbiAgICByZXR1cm4gKGZpcnN0SlMgJiYgZmlyc3RKUy50ZXh0KSB8fCBcIlwiXG4gIH1cblxuICAvKiogR2V0cyB0aGUgRFRTIGZvciB0aGUgSlMvVFMgIG9mIGNvbXBpbGluZyB5b3VyIGVkaXRvcidzIGNvZGUgKi9cbiAgY29uc3QgZ2V0RFRTRm9yQ29kZSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZXRFbWl0UmVzdWx0KClcbiAgICByZXR1cm4gcmVzdWx0Lm91dHB1dEZpbGVzLmZpbmQoKG86IGFueSkgPT4gby5uYW1lLmVuZHNXaXRoKFwiLmQudHNcIikpIS50ZXh0XG4gIH1cblxuICBjb25zdCBnZXRXb3JrZXJQcm9jZXNzID0gYXN5bmMgKCk6IFByb21pc2U8VHlwZVNjcmlwdFdvcmtlcj4gPT4ge1xuICAgIGNvbnN0IHdvcmtlciA9IGF3YWl0IGdldFdvcmtlcigpXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHJldHVybiBhd2FpdCB3b3JrZXIobW9kZWwudXJpKVxuICB9XG5cbiAgY29uc3QgZ2V0RG9tTm9kZSA9ICgpID0+IGVkaXRvci5nZXREb21Ob2RlKCkhXG4gIGNvbnN0IGdldE1vZGVsID0gKCkgPT4gZWRpdG9yLmdldE1vZGVsKCkhXG4gIGNvbnN0IGdldFRleHQgPSAoKSA9PiBnZXRNb2RlbCgpLmdldFZhbHVlKClcbiAgY29uc3Qgc2V0VGV4dCA9ICh0ZXh0OiBzdHJpbmcpID0+IGdldE1vZGVsKCkuc2V0VmFsdWUodGV4dClcblxuICBjb25zdCBzZXR1cFRTVkZTID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGZzTWFwID0gYXdhaXQgdHN2ZnMuY3JlYXRlRGVmYXVsdE1hcEZyb21DRE4oY29tcGlsZXJPcHRpb25zLCB0cy52ZXJzaW9uLCB0cnVlLCB0cywgbHpzdHJpbmcpXG4gICAgZnNNYXAuc2V0KGZpbGVQYXRoLnBhdGgsIGdldFRleHQoKSlcblxuICAgIGNvbnN0IHN5c3RlbSA9IHRzdmZzLmNyZWF0ZVN5c3RlbShmc01hcClcbiAgICBjb25zdCBob3N0ID0gdHN2ZnMuY3JlYXRlVmlydHVhbENvbXBpbGVySG9zdChzeXN0ZW0sIGNvbXBpbGVyT3B0aW9ucywgdHMpXG5cbiAgICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh7XG4gICAgICByb290TmFtZXM6IFsuLi5mc01hcC5rZXlzKCldLFxuICAgICAgb3B0aW9uczogY29tcGlsZXJPcHRpb25zLFxuICAgICAgaG9zdDogaG9zdC5jb21waWxlckhvc3QsXG4gICAgfSlcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9ncmFtLFxuICAgICAgc3lzdGVtLFxuICAgICAgaG9zdCxcbiAgICAgIGZzTWFwLFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgVFMgUHJvZ3JhbSwgaWYgeW91J3JlIGRvaW5nIGFueXRoaW5nIGNvbXBsZXhcbiAgICogaXQncyBsaWtlbHkgeW91IHdhbnQgc2V0dXBUU1ZGUyBpbnN0ZWFkIGFuZCBjYW4gcHVsbCBwcm9ncmFtIG91dCBmcm9tIHRoYXRcbiAgICpcbiAgICogV2FybmluZzogUnVucyBvbiB0aGUgbWFpbiB0aHJlYWRcbiAgICovXG4gIGNvbnN0IGNyZWF0ZVRTUHJvZ3JhbSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB0c3ZmcyA9IGF3YWl0IHNldHVwVFNWRlMoKVxuICAgIHJldHVybiB0c3Zmcy5wcm9ncmFtXG4gIH1cblxuICBjb25zdCBnZXRBU1QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IGF3YWl0IGNyZWF0ZVRTUHJvZ3JhbSgpXG4gICAgcHJvZ3JhbS5lbWl0KClcbiAgICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVQYXRoLnBhdGgpIVxuICB9XG5cbiAgLy8gUGFzcyBhbG9uZyB0aGUgc3VwcG9ydGVkIHJlbGVhc2VzIGZvciB0aGUgcGxheWdyb3VuZFxuICBjb25zdCBzdXBwb3J0ZWRWZXJzaW9ucyA9IHN1cHBvcnRlZFJlbGVhc2VzXG5cbiAgcmV0dXJuIHtcbiAgICAvKiogVGhlIHNhbWUgY29uZmlnIHlvdSBwYXNzZWQgaW4gKi9cbiAgICBjb25maWcsXG4gICAgLyoqIEEgbGlzdCBvZiBUeXBlU2NyaXB0IHZlcnNpb25zIHlvdSBjYW4gdXNlIHdpdGggdGhlIFR5cGVTY3JpcHQgc2FuZGJveCAqL1xuICAgIHN1cHBvcnRlZFZlcnNpb25zLFxuICAgIC8qKiBUaGUgbW9uYWNvIGVkaXRvciBpbnN0YW5jZSAqL1xuICAgIGVkaXRvcixcbiAgICAvKiogRWl0aGVyIFwidHlwZXNjcmlwdFwiIG9yIFwiamF2YXNjcmlwdFwiIGRlcGVuZGluZyBvbiB5b3VyIGNvbmZpZyAqL1xuICAgIGxhbmd1YWdlLFxuICAgIC8qKiBUaGUgb3V0ZXIgbW9uYWNvIG1vZHVsZSwgdGhlIHJlc3VsdCBvZiByZXF1aXJlKFwibW9uYWNvLWVkaXRvclwiKSAgKi9cbiAgICBtb25hY28sXG4gICAgLyoqIEdldHMgYSBtb25hY28tdHlwZXNjcmlwdCB3b3JrZXIsIHRoaXMgd2lsbCBnaXZlIHlvdSBhY2Nlc3MgdG8gYSBsYW5ndWFnZSBzZXJ2ZXIuIE5vdGU6IHByZWZlciB0aGlzIGZvciBsYW5ndWFnZSBzZXJ2ZXIgd29yayBiZWNhdXNlIGl0IGhhcHBlbnMgb24gYSB3ZWJ3b3JrZXIgLiAqL1xuICAgIGdldFdvcmtlclByb2Nlc3MsXG4gICAgLyoqIEEgY29weSBvZiByZXF1aXJlKFwiQHR5cGVzY3JpcHQvdmZzXCIpIHRoaXMgY2FuIGJlIHVzZWQgdG8gcXVpY2tseSBzZXQgdXAgYW4gaW4tbWVtb3J5IGNvbXBpbGVyIHJ1bnMgZm9yIEFTVHMsIG9yIHRvIGdldCBjb21wbGV4IGxhbmd1YWdlIHNlcnZlciByZXN1bHRzIChhbnl0aGluZyBhYm92ZSBoYXMgdG8gYmUgc2VyaWFsaXplZCB3aGVuIHBhc3NlZCkqL1xuICAgIHRzdmZzLFxuICAgIC8qKiBHZXQgYWxsIHRoZSBkaWZmZXJlbnQgZW1pdHRlZCBmaWxlcyBhZnRlciBUeXBlU2NyaXB0IGlzIHJ1biAqL1xuICAgIGdldEVtaXRSZXN1bHQsXG4gICAgLyoqIEdldHMganVzdCB0aGUgSmF2YVNjcmlwdCBmb3IgeW91ciBzYW5kYm94LCB3aWxsIHRyYW5zcGlsZSBpZiBpbiBUUyBvbmx5ICovXG4gICAgZ2V0UnVubmFibGVKUyxcbiAgICAvKiogR2V0cyB0aGUgRFRTIG91dHB1dCBvZiB0aGUgbWFpbiBjb2RlIGluIHRoZSBlZGl0b3IgKi9cbiAgICBnZXREVFNGb3JDb2RlLFxuICAgIC8qKiBUaGUgbW9uYWNvLWVkaXRvciBkb20gbm9kZSwgdXNlZCBmb3Igc2hvd2luZy9oaWRpbmcgdGhlIGVkaXRvciAqL1xuICAgIGdldERvbU5vZGUsXG4gICAgLyoqIFRoZSBtb2RlbCBpcyBhbiBvYmplY3Qgd2hpY2ggbW9uYWNvIHVzZXMgdG8ga2VlcCB0cmFjayBvZiB0ZXh0IGluIHRoZSBlZGl0b3IuIFVzZSB0aGlzIHRvIGRpcmVjdGx5IG1vZGlmeSB0aGUgdGV4dCBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0TW9kZWwsXG4gICAgLyoqIEdldHMgdGhlIHRleHQgb2YgdGhlIG1haW4gbW9kZWwsIHdoaWNoIGlzIHRoZSB0ZXh0IGluIHRoZSBlZGl0b3IgKi9cbiAgICBnZXRUZXh0LFxuICAgIC8qKiBTaG9ydGN1dCBmb3Igc2V0dGluZyB0aGUgbW9kZWwncyB0ZXh0IGNvbnRlbnQgd2hpY2ggd291bGQgdXBkYXRlIHRoZSBlZGl0b3IgKi9cbiAgICBzZXRUZXh0LFxuICAgIC8qKiBHZXRzIHRoZSBBU1Qgb2YgdGhlIGN1cnJlbnQgdGV4dCBpbiBtb25hY28gLSB1c2VzIGBjcmVhdGVUU1Byb2dyYW1gLCBzbyB0aGUgcGVyZm9ybWFuY2UgY2F2ZWF0IGFwcGxpZXMgdGhlcmUgdG9vICovXG4gICAgZ2V0QVNULFxuICAgIC8qKiBUaGUgbW9kdWxlIHlvdSBnZXQgZnJvbSByZXF1aXJlKFwidHlwZXNjcmlwdFwiKSAqL1xuICAgIHRzLFxuICAgIC8qKiBDcmVhdGUgYSBuZXcgUHJvZ3JhbSwgYSBUeXBlU2NyaXB0IGRhdGEgbW9kZWwgd2hpY2ggcmVwcmVzZW50cyB0aGUgZW50aXJlIHByb2plY3QuIEFzIHdlbGwgYXMgc29tZSBvZiB0aGVcbiAgICAgKiBwcmltaXRpdmUgb2JqZWN0cyB5b3Ugd291bGQgbm9ybWFsbHkgbmVlZCB0byBkbyB3b3JrIHdpdGggdGhlIGZpbGVzLlxuICAgICAqXG4gICAgICogVGhlIGZpcnN0IHRpbWUgdGhpcyBpcyBjYWxsZWQgaXQgaGFzIHRvIGRvd25sb2FkIGFsbCB0aGUgRFRTIGZpbGVzIHdoaWNoIGlzIG5lZWRlZCBmb3IgYW4gZXhhY3QgY29tcGlsZXIgcnVuLiBXaGljaFxuICAgICAqIGF0IG1heCBpcyBhYm91dCAxLjVNQiAtIGFmdGVyIHRoYXQgc3Vic2VxdWVudCBkb3dubG9hZHMgb2YgZHRzIGxpYiBmaWxlcyBjb21lIGZyb20gbG9jYWxTdG9yYWdlLlxuICAgICAqXG4gICAgICogVHJ5IHRvIHVzZSB0aGlzIHNwYXJpbmdseSBhcyBpdCBjYW4gYmUgY29tcHV0YXRpb25hbGx5IGV4cGVuc2l2ZSwgYXQgdGhlIG1pbmltdW0geW91IHNob3VsZCBiZSB1c2luZyB0aGUgZGVib3VuY2VkIHNldHVwLlxuICAgICAqXG4gICAgICogVE9ETzogSXQgd291bGQgYmUgZ29vZCB0byBjcmVhdGUgYW4gZWFzeSB3YXkgdG8gaGF2ZSBhIHNpbmdsZSBwcm9ncmFtIGluc3RhbmNlIHdoaWNoIGlzIHVwZGF0ZWQgZm9yIHlvdVxuICAgICAqIHdoZW4gdGhlIG1vbmFjbyBtb2RlbCBjaGFuZ2VzLlxuICAgICAqL1xuICAgIHNldHVwVFNWRlMsXG4gICAgLyoqIFVzZXMgdGhlIGFib3ZlIGNhbGwgc2V0dXBUU1ZGUywgYnV0IG9ubHkgcmV0dXJucyB0aGUgcHJvZ3JhbSAqL1xuICAgIGNyZWF0ZVRTUHJvZ3JhbSxcbiAgICAvKiogVGhlIFNhbmRib3gncyBkZWZhdWx0IGNvbXBpbGVyIG9wdGlvbnMgICovXG4gICAgY29tcGlsZXJEZWZhdWx0cyxcbiAgICAvKiogVGhlIFNhbmRib3gncyBjdXJyZW50IGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICBnZXRDb21waWxlck9wdGlvbnMsXG4gICAgLyoqIFJlcGxhY2UgdGhlIFNhbmRib3gncyBjb21waWxlciBvcHRpb25zICovXG4gICAgc2V0Q29tcGlsZXJTZXR0aW5ncyxcbiAgICAvKiogT3ZlcndyaXRlIHRoZSBTYW5kYm94J3MgY29tcGlsZXIgb3B0aW9ucyAqL1xuICAgIHVwZGF0ZUNvbXBpbGVyU2V0dGluZyxcbiAgICAvKiogVXBkYXRlIGEgc2luZ2xlIGNvbXBpbGVyIG9wdGlvbiBpbiB0aGUgU0FuZGJveCAqL1xuICAgIHVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MsXG4gICAgLyoqIEEgd2F5IHRvIGdldCBjYWxsYmFja3Mgd2hlbiBjb21waWxlciBzZXR0aW5ncyBoYXZlIGNoYW5nZWQgKi9cbiAgICBzZXREaWRVcGRhdGVDb21waWxlclNldHRpbmdzLFxuICAgIC8qKiBBIGNvcHkgb2YgbHpzdHJpbmcsIHdoaWNoIGlzIHVzZWQgdG8gYXJjaGl2ZS91bmFyY2hpdmUgY29kZSAqL1xuICAgIGx6c3RyaW5nLFxuICAgIC8qKiBSZXR1cm5zIGNvbXBpbGVyIG9wdGlvbnMgZm91bmQgaW4gdGhlIHBhcmFtcyBvZiB0aGUgY3VycmVudCBwYWdlICovXG4gICAgY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zLFxuICAgIC8qKiBSZXR1cm5zIGNvbXBpbGVyIG9wdGlvbnMgaW4gdGhlIHNvdXJjZSBjb2RlIHVzaW5nIHR3b3NsYXNoIG5vdGF0aW9uICovXG4gICAgZ2V0VHdvU2xhc2hDb21wbGllck9wdGlvbnMsXG4gICAgLyoqIEdldHMgdG8gdGhlIGN1cnJlbnQgbW9uYWNvLWxhbmd1YWdlLCB0aGlzIGlzIGhvdyB5b3UgdGFsayB0byB0aGUgYmFja2dyb3VuZCB3ZWJ3b3JrZXJzICovXG4gICAgbGFuZ3VhZ2VTZXJ2aWNlRGVmYXVsdHM6IGRlZmF1bHRzLFxuICAgIC8qKiBUaGUgcGF0aCB3aGljaCByZXByZXNlbnRzIHRoZSBjdXJyZW50IGZpbGUgdXNpbmcgdGhlIGN1cnJlbnQgY29tcGlsZXIgb3B0aW9ucyAqL1xuICAgIGZpbGVwYXRoOiBmaWxlUGF0aC5wYXRoLFxuICB9XG59XG5cbmV4cG9ydCB0eXBlIFNhbmRib3ggPSBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVUeXBlU2NyaXB0U2FuZGJveD5cbiJdfQ==