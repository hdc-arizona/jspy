(function() {

var JSPy = {};

JSPy.makePythonFunction = function(f) {
    return function() {
        var realArgs = Array(arguments.length);
        for (var i=0; i<arguments.length; ++i)
            realArgs[i] = arguments[i];
        return pythonApply(f, realArgs);
    };
};
    
function pythonApply(f, args) {
    var locals = {};
    
    // ignore kwargs for now, and use javascript's parameter leniency semantics..
    f.args.args.forEach(function(name, i) {
        locals[name] = args[i];
    });
    var ip = 0;
    var stack = [], a, b;
    var compare_op = {
        '<': function(a, b) { return a < b; },
        '<=': function(a, b) { return a <= b; },
        '==': function(a, b) { return a === b; }, // wrong
        '!=': function(a, b) { return a !== b; }, // wrong
        '>': function(a, b) { return a > b; },
        '>=': function(a, b) { return a <= b; },
        'in': function(a, b) { throw new Error("unimplemented"); },
        'not in': function(a, b) { throw new Error("unimplemented"); },
        'is': function(a, b) { return a === b; }, // wrong
        'is not': function(a, b) { return a !== b; }, // wrong
        'exception match': function(a, b) { throw new Error("unimplemented"); }
    };
    if (f._by_offset === undefined) {
        var instructions_by_offset = [];
        for (var i=0; i<f.insts.length; ++i) {
            instructions_by_offset[f.insts[i].offset] = i;
        }
        f._by_offset = instructions_by_offset;
    }
    while (1) {
        var inst = f.insts[ip++];
        // superslow with string comparisons but we don't care for now.
        switch (inst.opname) {
        case 'RETURN_VALUE':
            return stack.pop();
        case 'LOAD_FAST':
            stack.push(locals[inst.argval]);
            continue;
        case 'STORE_FAST':
            locals[inst.argval] = stack.pop();
            continue;
        case 'LOAD_CONST':
            stack.push(inst.argval);
            continue;
        case 'LOAD_ATTR':
            stack.push(stack.pop()[inst.argval]);
            continue;
        case 'POP_JUMP_IF_FALSE':
            a = stack.pop();
            if (!a) {
                ip = f._by_offset[inst.argval];
            }
            continue;
        case 'COMPARE_OP':
            b = stack.pop();
            a = stack.pop();
            stack.push(compare_op[inst.argval](a,b));
            continue;
        case 'BINARY_ADD':
            b = stack.pop();
            a = stack.pop();
            stack.push(a + b);
            continue;
        case 'BINARY_SUBTRACT':
            b = stack.pop();
            a = stack.pop();
            stack.push(a - b);
            continue;
        case 'BINARY_MULTIPLY':
            b = stack.pop();
            a = stack.pop();
            stack.push(a * b);
            continue;
        case 'BINARY_SUBSCR':
            b = stack.pop();
            a = stack.pop();
            stack.push(a[b]);
            continue;
        case 'BINARY_POWER':
            b = stack.pop();
            a = stack.pop();
            stack.push(Math.pow(a, b));
            continue;
        case 'BINARY_TRUE_DIVIDE':
            b = stack.pop();
            a = stack.pop();
            stack.push(a / b);
            continue;
        case 'BINARY_FLOOR_DIVIDE':
            b = stack.pop();
            a = stack.pop();
            stack.push(Math.floor(a / b));
            continue;
        case 'BINARY_MODULO':
            b = stack.pop();
            a = stack.pop();
            stack.push(a % b);
            continue;
        case 'BINARY_LSHIFT':
            b = stack.pop();
            a = stack.pop();
            stack.push(a << b);
            continue;
        case 'BINARY_RSHIFT':
            b = stack.pop();
            a = stack.pop();
            stack.push(a << b);
            continue;
        case 'BINARY_AND':
            b = stack.pop();
            a = stack.pop();
            stack.push(a & b);
            continue;
        case 'BINARY_OR':
            b = stack.pop();
            a = stack.pop();
            stack.push(a | b);
            continue;
        case 'BUILD_CONST_KEY_MAP':
            var keys = stack[stack.length-1];
            var result = {};
            for (var offset=0; offset<keys.length; ++offset) {
                result[keys[offset]] = stack[stack.length-1-keys.length+offset];
            }
            stack.splice(stack.length-1-keys.length, keys.length+1, result);
            continue;
        default:
            throw new Error("Don't know how to read " + inst.opname);
        }
    }
};

JSPy.returnResult = function(val) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "http://localhost:8889/return");
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify(val));
};
    
window.JSPy = JSPy;

})();

//////////////////////////////////////////////////////////////////////////////

