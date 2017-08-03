# Stupid Javascript Jupyter Notebook tricks

Make your python Jupyter notebooks speak Javascript. This is
occasionally useful when you want to write custom Javascript code for
some notebooks. Specifically, this came up when writing a custom d3
chart for some data analysis.

You'll need the following `pip` packages:

* `flask`
* `flask-cors`
* `ulid`

Of course, you'll want to do this in a jupyter notebook, so you'll 
need that too.

# HOWTO

Copy the two files, `jspy.js` and `js.py`, into your main notebook
directory (yeah, I know, this is ugly. But then again, so are these
tricks.) Then, add this line to your notebook:

    import js
	
The most useful function there is `js_call`, which lets you make a
call to a javascript function. If you have defined (elsewhere, by
whatever means) a Javascript function `foo` like this

    // This is javascript code!
	function foo(x) {
	    return x * 3;
	}

then, in your python notebook, you can do this:

    # This is python code!
    x = js.js_call("foo", 10)
	print(x)

And that should print `30` on your notebook output. Typically, you
use this to fire off something like a `d3` call, and you don't care
about the output. But if you do, what happens is that the JS side
serializes the result of the call using JSON and ships it back.

On the Python-to-JS side of marshalling, things are a little cooler,
and you can actually ship (some) Python code:

	// This is javascript code!
	function twice(f, x) {
	    return f(f(x));
	}
    # This is python code!
	def times_5(x):
	    return x * 5
	print(js.js_call("twice", times_5, 3))
	
That should print `75` to your notebook output. (If you're curious,
the way this works is we ship Python bytecode across the language
barrier and interpret it in Javascript. Yes, this kind of works.)



