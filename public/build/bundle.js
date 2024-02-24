
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Header.svelte generated by Svelte v3.59.2 */

    const file$a = "src/Header.svelte";

    function create_fragment$b(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let header;
    	let t2;
    	let p;
    	let span0;
    	let t4;
    	let span1;
    	let t6;
    	let a;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			header = element("header");
    			header.textContent = "Sofia Maselli";
    			t2 = space();
    			p = element("p");
    			span0 = element("span");
    			span0.textContent = "Email:";
    			t4 = text(" sofia.maselli@esssec.edu    \n        ");
    			span1 = element("span");
    			span1.textContent = "Phone:";
    			t6 = text(" (+39) 3665547025    \n        ");
    			a = element("a");
    			a.textContent = "LinkedIn";
    			attr_dev(div0, "class", "fixed left-0 top-0 w-full h-8 bg-gradient-to-r from-blue-400 to-green-400");
    			add_location(div0, file$a, 1, 4, 10);
    			attr_dev(header, "class", "relative text-5xl font-bold text-center py-8");
    			add_location(header, file$a, 3, 4, 148);
    			attr_dev(span0, "class", "font-bold");
    			add_location(span0, file$a, 5, 8, 281);
    			attr_dev(span1, "class", "font-bold");
    			add_location(span1, file$a, 6, 8, 371);
    			attr_dev(a, "href", "https://www.linkedin.com/in/sofia-maselli-38031a1b8/");
    			attr_dev(a, "class", "text-blue-600 underline");
    			add_location(a, file$a, 7, 8, 453);
    			attr_dev(p, "class", "text-center text-xl pb-6");
    			add_location(p, file$a, 4, 4, 236);
    			attr_dev(div1, "class", "container mx-auto p-6");
    			add_location(div1, file$a, 2, 4, 108);
    			add_location(div2, file$a, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, header);
    			append_dev(div1, t2);
    			append_dev(div1, p);
    			append_dev(p, span0);
    			append_dev(p, t4);
    			append_dev(p, span1);
    			append_dev(p, t6);
    			append_dev(p, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/Contact_Info.svelte generated by Svelte v3.59.2 */

    const file$9 = "src/Contact_Info.svelte";

    function create_fragment$a(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let hr;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let p2;
    	let t8;
    	let p3;
    	let t10;
    	let a;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Contact Information";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Email";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "sofia.maselli@essec.edu";
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "Phone";
    			t8 = space();
    			p3 = element("p");
    			p3.textContent = "(+39) 3665547025";
    			t10 = space();
    			a = element("a");
    			a.textContent = "LinkedIn";
    			attr_dev(h2, "class", "text-xl font-bold mb-2");
    			add_location(h2, file$9, 2, 4, 68);
    			attr_dev(hr, "class", "border-b-2 border-blue-300 mb-4");
    			add_location(hr, file$9, 3, 4, 132);
    			attr_dev(p0, "class", "font-bold");
    			add_location(p0, file$9, 4, 4, 181);
    			add_location(p1, file$9, 5, 4, 216);
    			attr_dev(p2, "class", "font-bold");
    			add_location(p2, file$9, 6, 4, 251);
    			add_location(p3, file$9, 7, 4, 286);
    			attr_dev(a, "href", "https://www.linkedin.com/in/sofia-maselli-38031a1b8/");
    			attr_dev(a, "class", "text-blue-600 underline");
    			add_location(a, file$9, 8, 4, 314);
    			attr_dev(div0, "class", "mb-8");
    			add_location(div0, file$9, 1, 2, 45);
    			attr_dev(div1, "class", "bg-blue-400 p-4 mb-6 rounded");
    			add_location(div1, file$9, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, hr);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(div0, t4);
    			append_dev(div0, p1);
    			append_dev(div0, t6);
    			append_dev(div0, p2);
    			append_dev(div0, t8);
    			append_dev(div0, p3);
    			append_dev(div0, t10);
    			append_dev(div0, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Contact_Info', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Contact_Info> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Contact_Info extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact_Info",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/Skills.svelte generated by Svelte v3.59.2 */

    const file$8 = "src/Skills.svelte";

    function create_fragment$9(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let hr;
    	let t2;
    	let ul;
    	let li0;
    	let t4;
    	let li1;
    	let t6;
    	let li2;
    	let t8;
    	let li3;
    	let t10;
    	let li4;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Skills";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Python";
    			t4 = space();
    			li1 = element("li");
    			li1.textContent = "SQL";
    			t6 = space();
    			li2 = element("li");
    			li2.textContent = "R";
    			t8 = space();
    			li3 = element("li");
    			li3.textContent = "STATA";
    			t10 = space();
    			li4 = element("li");
    			li4.textContent = "Amazon QuickSight";
    			attr_dev(h2, "class", "text-xl font-bold mb-2");
    			add_location(h2, file$8, 2, 4, 69);
    			attr_dev(hr, "class", "border-b-2 border-green-300 mb-4");
    			add_location(hr, file$8, 3, 4, 120);
    			add_location(li0, file$8, 5, 6, 204);
    			add_location(li1, file$8, 6, 6, 226);
    			add_location(li2, file$8, 7, 6, 245);
    			add_location(li3, file$8, 8, 6, 262);
    			add_location(li4, file$8, 9, 6, 283);
    			attr_dev(ul, "class", "list-disc ml-5");
    			add_location(ul, file$8, 4, 4, 170);
    			attr_dev(div0, "class", "mb-8");
    			add_location(div0, file$8, 1, 2, 46);
    			attr_dev(div1, "class", "bg-green-400 p-4 mb-6 rounded");
    			add_location(div1, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, hr);
    			append_dev(div0, t2);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(ul, t8);
    			append_dev(ul, li3);
    			append_dev(ul, t10);
    			append_dev(ul, li4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Skills', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Skills> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Skills extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Skills",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/Languages.svelte generated by Svelte v3.59.2 */

    const file$7 = "src/Languages.svelte";

    function create_fragment$8(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let hr;
    	let t2;
    	let ul;
    	let li0;
    	let t4;
    	let li1;
    	let t6;
    	let li2;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Languages";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Italian - Native";
    			t4 = space();
    			li1 = element("li");
    			li1.textContent = "English - Fluent (C1)";
    			t6 = space();
    			li2 = element("li");
    			li2.textContent = "Spanish - Intermediate";
    			attr_dev(h2, "class", "text-xl font-bold mb-2");
    			add_location(h2, file$7, 2, 4, 57);
    			attr_dev(hr, "class", "border-b-2 border-yellow-300 mb-4");
    			add_location(hr, file$7, 3, 4, 111);
    			add_location(li0, file$7, 5, 6, 196);
    			add_location(li1, file$7, 6, 6, 228);
    			add_location(li2, file$7, 7, 6, 265);
    			attr_dev(ul, "class", "list-disc ml-5");
    			add_location(ul, file$7, 4, 4, 162);
    			add_location(div0, file$7, 1, 2, 47);
    			attr_dev(div1, "class", "bg-yellow-400 p-4 mb-6 rounded");
    			add_location(div1, file$7, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, hr);
    			append_dev(div0, t2);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Languages', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Languages> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Languages extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Languages",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/Education.svelte generated by Svelte v3.59.2 */

    const file$6 = "src/Education.svelte";

    function create_fragment$7(ctx) {
    	let div4;
    	let hr;
    	let t0;
    	let div0;
    	let h30;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let p2;
    	let t8;
    	let div1;
    	let h31;
    	let t10;
    	let p3;
    	let t12;
    	let p4;
    	let t14;
    	let p5;
    	let t16;
    	let div2;
    	let h32;
    	let t18;
    	let p6;
    	let t20;
    	let p7;
    	let t22;
    	let p8;
    	let t24;
    	let div3;
    	let h33;
    	let t26;
    	let p9;
    	let t28;
    	let p10;
    	let t30;
    	let p11;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			hr = element("hr");
    			t0 = space();
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Bocconi University";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "MSc Data Science and Business Analytics";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Milan, Italy";
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "2022 - 2024";
    			t8 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "ESSEC Business School";
    			t10 = space();
    			p3 = element("p");
    			p3.textContent = "Exchange Program";
    			t12 = space();
    			p4 = element("p");
    			p4.textContent = "Cergy, France";
    			t14 = space();
    			p5 = element("p");
    			p5.textContent = "2024";
    			t16 = space();
    			div2 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Bocconi University";
    			t18 = space();
    			p6 = element("p");
    			p6.textContent = "BSc Business Administration and Management";
    			t20 = space();
    			p7 = element("p");
    			p7.textContent = "Milan, Italy";
    			t22 = space();
    			p8 = element("p");
    			p8.textContent = "2019 - 2022";
    			t24 = space();
    			div3 = element("div");
    			h33 = element("h3");
    			h33.textContent = "University of Maryland";
    			t26 = space();
    			p9 = element("p");
    			p9.textContent = "Exchange Program";
    			t28 = space();
    			p10 = element("p");
    			p10.textContent = "College Park, USA";
    			t30 = space();
    			p11 = element("p");
    			p11.textContent = "2022";
    			attr_dev(hr, "class", "border-b-2 border-blue-300 mb-8");
    			add_location(hr, file$6, 1, 4, 10);
    			attr_dev(h30, "class", "text-xl font-bold");
    			add_location(h30, file$6, 3, 8, 96);
    			attr_dev(p0, "class", "font-bold text-lg");
    			add_location(p0, file$6, 4, 8, 158);
    			attr_dev(p1, "class", "text-lg");
    			add_location(p1, file$6, 5, 8, 239);
    			attr_dev(p2, "class", "text-lg");
    			add_location(p2, file$6, 6, 8, 283);
    			attr_dev(div0, "class", "mb-4 ml-4 mr-4");
    			add_location(div0, file$6, 2, 4, 59);
    			attr_dev(h31, "class", "text-xl font-bold");
    			add_location(h31, file$6, 9, 8, 370);
    			attr_dev(p3, "class", "font-bold text-lg");
    			add_location(p3, file$6, 10, 8, 435);
    			attr_dev(p4, "class", "text-lg");
    			add_location(p4, file$6, 11, 8, 493);
    			attr_dev(p5, "class", "text-lg");
    			add_location(p5, file$6, 12, 8, 538);
    			attr_dev(div1, "class", "mb-4 ml-4 mr-4");
    			add_location(div1, file$6, 8, 4, 333);
    			attr_dev(h32, "class", "text-xl font-bold");
    			add_location(h32, file$6, 15, 8, 618);
    			attr_dev(p6, "class", "font-bold text-lg");
    			add_location(p6, file$6, 16, 8, 680);
    			attr_dev(p7, "class", "text-lg");
    			add_location(p7, file$6, 17, 8, 764);
    			attr_dev(p8, "class", "text-lg");
    			add_location(p8, file$6, 18, 8, 808);
    			attr_dev(div2, "class", "mb-4 ml-4 mr-4");
    			add_location(div2, file$6, 14, 4, 581);
    			attr_dev(h33, "class", "text-xl font-bold");
    			add_location(h33, file$6, 21, 8, 895);
    			attr_dev(p9, "class", "font-bold text-lg");
    			add_location(p9, file$6, 22, 8, 961);
    			attr_dev(p10, "class", "text-lg");
    			add_location(p10, file$6, 23, 8, 1019);
    			attr_dev(p11, "class", "text-lg");
    			add_location(p11, file$6, 24, 8, 1068);
    			attr_dev(div3, "class", "mb-4 ml-4 mr-4");
    			add_location(div3, file$6, 20, 4, 858);
    			add_location(div4, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, hr);
    			append_dev(div4, t0);
    			append_dev(div4, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(div0, t4);
    			append_dev(div0, p1);
    			append_dev(div0, t6);
    			append_dev(div0, p2);
    			append_dev(div4, t8);
    			append_dev(div4, div1);
    			append_dev(div1, h31);
    			append_dev(div1, t10);
    			append_dev(div1, p3);
    			append_dev(div1, t12);
    			append_dev(div1, p4);
    			append_dev(div1, t14);
    			append_dev(div1, p5);
    			append_dev(div4, t16);
    			append_dev(div4, div2);
    			append_dev(div2, h32);
    			append_dev(div2, t18);
    			append_dev(div2, p6);
    			append_dev(div2, t20);
    			append_dev(div2, p7);
    			append_dev(div2, t22);
    			append_dev(div2, p8);
    			append_dev(div4, t24);
    			append_dev(div4, div3);
    			append_dev(div3, h33);
    			append_dev(div3, t26);
    			append_dev(div3, p9);
    			append_dev(div3, t28);
    			append_dev(div3, p10);
    			append_dev(div3, t30);
    			append_dev(div3, p11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Education', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Education> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Education extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Education",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/Experience.svelte generated by Svelte v3.59.2 */

    const file$5 = "src/Experience.svelte";

    function create_fragment$6(ctx) {
    	let div2;
    	let hr;
    	let t0;
    	let div0;
    	let h30;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let ul0;
    	let li0;
    	let t8;
    	let li1;
    	let t10;
    	let div1;
    	let h31;
    	let t12;
    	let p2;
    	let t14;
    	let p3;
    	let t16;
    	let ul1;
    	let li2;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			hr = element("hr");
    			t0 = space();
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Amazon - Business Intelligence Engineer";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Barcelona, Spain";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Jun 2023 - Dec 2023";
    			t6 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "Primary owner of several projects involving the data management\n                of the team (shipment tracking, automated KPI reports and\n                dashboards development).";
    			t8 = space();
    			li1 = element("li");
    			li1.textContent = "SQL programming and data visualization on QuickSight.";
    			t10 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Maselli Misure - Intern";
    			t12 = space();
    			p2 = element("p");
    			p2.textContent = "Parma, Italy";
    			t14 = space();
    			p3 = element("p");
    			p3.textContent = "Jul 2021 - Aug 2021";
    			t16 = space();
    			ul1 = element("ul");
    			li2 = element("li");
    			li2.textContent = "Prepared summary charts using SQL Server queries and Microsoft Excel regarding \n                Sales and Costs Management.";
    			attr_dev(hr, "class", "border-b-2 border-blue-300 mb-8");
    			add_location(hr, file$5, 1, 4, 11);
    			attr_dev(h30, "class", "text-xl font-bold");
    			add_location(h30, file$5, 3, 8, 97);
    			attr_dev(p0, "class", "text-lg");
    			add_location(p0, file$5, 4, 8, 180);
    			attr_dev(p1, "class", "text-lg");
    			add_location(p1, file$5, 5, 8, 228);
    			add_location(li0, file$5, 7, 12, 319);
    			add_location(li1, file$5, 10, 12, 519);
    			attr_dev(ul0, "class", "list-disc ml-5");
    			add_location(ul0, file$5, 6, 8, 279);
    			attr_dev(div0, "class", "mb-4 ml-4 mr-4");
    			add_location(div0, file$5, 2, 4, 60);
    			attr_dev(h31, "class", "text-xl font-bold");
    			add_location(h31, file$5, 14, 8, 648);
    			attr_dev(p2, "class", "text-lg");
    			add_location(p2, file$5, 15, 8, 715);
    			attr_dev(p3, "class", "text-lg");
    			add_location(p3, file$5, 16, 8, 759);
    			add_location(li2, file$5, 18, 12, 850);
    			attr_dev(ul1, "class", "list-disc ml-5");
    			add_location(ul1, file$5, 17, 8, 810);
    			attr_dev(div1, "class", "mb-4 ml-4 mr-4");
    			add_location(div1, file$5, 13, 4, 611);
    			add_location(div2, file$5, 0, 1, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, hr);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(div0, t4);
    			append_dev(div0, p1);
    			append_dev(div0, t6);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t8);
    			append_dev(ul0, li1);
    			append_dev(div2, t10);
    			append_dev(div2, div1);
    			append_dev(div1, h31);
    			append_dev(div1, t12);
    			append_dev(div1, p2);
    			append_dev(div1, t14);
    			append_dev(div1, p3);
    			append_dev(div1, t16);
    			append_dev(div1, ul1);
    			append_dev(ul1, li2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Experience', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Experience> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Experience extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Experience",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/Footer.svelte generated by Svelte v3.59.2 */

    const file$4 = "src/Footer.svelte";

    function create_fragment$5(ctx) {
    	let footer;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			attr_dev(footer, "class", "fixed bottom-0 left-0 w-full h-8 bg-gradient-to-r from-blue-400 to-green-400");
    			add_location(footer, file$4, 1, 0, 16);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/LanguagesChart.svelte generated by Svelte v3.59.2 */

    const file$3 = "src/LanguagesChart.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (11:4) {#each languages as language}
    function create_each_block(ctx) {
    	let div2;
    	let p;
    	let t0_value = /*language*/ ctx[1].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*language*/ ctx[1].proficiency + "";
    	let t2;
    	let t3;
    	let div1;
    	let div0;
    	let t4;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			div0 = element("div");
    			t4 = space();
    			add_location(p, file$3, 12, 8, 306);
    			attr_dev(div0, "class", "h-full bg-yellow-600");
    			set_style(div0, "width", /*language*/ ctx[1].level + "%");
    			add_location(div0, file$3, 14, 10, 402);
    			attr_dev(div1, "class", "h-4 bg-gray-300");
    			add_location(div1, file$3, 13, 8, 362);
    			attr_dev(div2, "class", "mb-2");
    			add_location(div2, file$3, 11, 6, 279);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div2, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*languages*/ 1 && t0_value !== (t0_value = /*language*/ ctx[1].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*languages*/ 1 && t2_value !== (t2_value = /*language*/ ctx[1].proficiency + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*languages*/ 1) {
    				set_style(div0, "width", /*language*/ ctx[1].level + "%");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(11:4) {#each languages as language}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let hr;
    	let t2;
    	let each_value = /*languages*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Languages";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "text-xl font-bold mb-2");
    			add_location(h2, file$3, 8, 4, 138);
    			attr_dev(hr, "class", "border-b-2 border-yellow-300 mb-4");
    			add_location(hr, file$3, 9, 4, 192);
    			add_location(div0, file$3, 7, 2, 128);
    			attr_dev(div1, "class", "bg-yellow-400 p-4 mb-6 rounded");
    			add_location(div1, file$3, 6, 0, 81);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, hr);
    			append_dev(div0, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div0, null);
    				}
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*languages*/ 1) {
    				each_value = /*languages*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LanguagesChart', slots, []);
    	let { languages = [] } = $$props;
    	const writable_props = ['languages'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LanguagesChart> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('languages' in $$props) $$invalidate(0, languages = $$props.languages);
    	};

    	$$self.$capture_state = () => ({ languages });

    	$$self.$inject_state = $$props => {
    		if ('languages' in $$props) $$invalidate(0, languages = $$props.languages);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [languages];
    }

    class LanguagesChart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { languages: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LanguagesChart",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get languages() {
    		throw new Error("<LanguagesChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set languages(value) {
    		throw new Error("<LanguagesChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ContactForm.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file$2 = "src/ContactForm.svelte";

    function create_fragment$3(ctx) {
    	let div3;
    	let h2;
    	let t1;
    	let form;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let div1;
    	let label1;
    	let t6;
    	let input1;
    	let t7;
    	let div2;
    	let label2;
    	let t9;
    	let textarea;
    	let t10;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Contact Form";
    			t1 = space();
    			form = element("form");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Name:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Email:";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "Message:";
    			t9 = space();
    			textarea = element("textarea");
    			t10 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			attr_dev(h2, "class", "text-xl font-bold mb-2");
    			add_location(h2, file$2, 26, 2, 557);
    			attr_dev(label0, "for", "name");
    			attr_dev(label0, "class", "block font-bold mb-1");
    			add_location(label0, file$2, 29, 6, 688);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "name");
    			attr_dev(input0, "class", "w-full px-3 py-2 border rounded-md");
    			attr_dev(input0, "placeholder", "Your name");
    			add_location(input0, file$2, 30, 6, 755);
    			attr_dev(div0, "class", "mb-4");
    			add_location(div0, file$2, 28, 4, 663);
    			attr_dev(label1, "for", "email");
    			attr_dev(label1, "class", "block font-bold mb-1");
    			add_location(label1, file$2, 33, 6, 910);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "id", "email");
    			attr_dev(input1, "class", "w-full px-3 py-2 border rounded-md");
    			attr_dev(input1, "placeholder", "Your email");
    			add_location(input1, file$2, 34, 6, 979);
    			attr_dev(div1, "class", "mb-4");
    			add_location(div1, file$2, 32, 4, 885);
    			attr_dev(label2, "for", "message");
    			attr_dev(label2, "class", "block font-bold mb-1");
    			add_location(label2, file$2, 37, 6, 1138);
    			attr_dev(textarea, "id", "message");
    			attr_dev(textarea, "class", "w-full px-3 py-2 border rounded-md");
    			attr_dev(textarea, "rows", "4");
    			attr_dev(textarea, "placeholder", "Your message");
    			add_location(textarea, file$2, 38, 6, 1211);
    			attr_dev(div2, "class", "mb-4");
    			add_location(div2, file$2, 36, 4, 1113);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "px-4 py-2 bg-gray-900 text-white rounded-md");
    			add_location(button, file$2, 40, 4, 1361);
    			add_location(form, file$2, 27, 2, 612);
    			attr_dev(div3, "class", "bg-blue-400 p-4 mb-6 rounded");
    			add_location(div3, file$2, 25, 0, 512);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h2);
    			append_dev(div3, t1);
    			append_dev(div3, form);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*name*/ ctx[0]);
    			append_dev(form, t4);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t6);
    			append_dev(div1, input1);
    			set_input_value(input1, /*email*/ ctx[1]);
    			append_dev(form, t7);
    			append_dev(form, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t9);
    			append_dev(div2, textarea);
    			set_input_value(textarea, /*message*/ ctx[2]);
    			append_dev(form, t10);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]),
    					listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[3]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && input0.value !== /*name*/ ctx[0]) {
    				set_input_value(input0, /*name*/ ctx[0]);
    			}

    			if (dirty & /*email*/ 2 && input1.value !== /*email*/ ctx[1]) {
    				set_input_value(input1, /*email*/ ctx[1]);
    			}

    			if (dirty & /*message*/ 4) {
    				set_input_value(textarea, /*message*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ContactForm', slots, []);
    	let name = '';
    	let email = '';
    	let message = '';

    	function handleSubmit() {
    		// Validate form inputs before submission
    		if (name.trim() === '' || email.trim() === '' || message.trim() === '') {
    			alert('Please fill out all fields.');
    			return;
    		}

    		// Form submission logic
    		console.log('Form submitted:', { name, email, message });

    		// Clear form fields after submission
    		$$invalidate(0, name = '');

    		$$invalidate(1, email = '');
    		$$invalidate(2, message = '');
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<ContactForm> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input1_input_handler() {
    		email = this.value;
    		$$invalidate(1, email);
    	}

    	function textarea_input_handler() {
    		message = this.value;
    		$$invalidate(2, message);
    	}

    	$$self.$capture_state = () => ({ name, email, message, handleSubmit });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('email' in $$props) $$invalidate(1, email = $$props.email);
    		if ('message' in $$props) $$invalidate(2, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		email,
    		message,
    		handleSubmit,
    		input0_input_handler,
    		input1_input_handler,
    		textarea_input_handler
    	];
    }

    class ContactForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactForm",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/Testimonials.svelte generated by Svelte v3.59.2 */

    const file$1 = "src/Testimonials.svelte";

    function create_fragment$2(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let button0;
    	let t1;
    	let div0;
    	let h3;
    	let t2;
    	let t3;
    	let p0;
    	let t4;
    	let t5;
    	let p1;
    	let t6;
    	let t7;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Back";
    			t1 = space();
    			div0 = element("div");
    			h3 = element("h3");
    			t2 = text(/*name*/ ctx[0]);
    			t3 = space();
    			p0 = element("p");
    			t4 = text(/*role*/ ctx[1]);
    			t5 = space();
    			p1 = element("p");
    			t6 = text(/*testimonial*/ ctx[2]);
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Forward";
    			attr_dev(button0, "class", "text-xs font-bold mb-2 mr-4 focus:outline-none px-4 py-2 rounded-md");
    			add_location(button0, file$1, 51, 6, 1556);
    			set_style(h3, "color", "black");
    			attr_dev(h3, "class", "text-lg font-bold");
    			add_location(h3, file$1, 53, 8, 1777);
    			set_style(p0, "color", "black");
    			attr_dev(p0, "class", "text-sm font-light");
    			add_location(p0, file$1, 54, 8, 1850);
    			set_style(p1, "color", "black");
    			attr_dev(p1, "class", "text-lg py-2");
    			add_location(p1, file$1, 55, 8, 1921);
    			attr_dev(div0, "class", "p-8 shrink text-2xl font-light leading-relaxed bg-white rounded-2xl shadow-2xl");
    			add_location(div0, file$1, 52, 6, 1676);
    			attr_dev(button1, "class", "text-xs font-bold mb-2 ml-4 focus:outline-none px-4 py-2 rounded-md");
    			add_location(button1, file$1, 58, 6, 2026);
    			attr_dev(div1, "class", "flex items-center");
    			add_location(div1, file$1, 50, 4, 1517);
    			attr_dev(div2, "class", "lg:w-full mx-auto flex flex-col lg:flex-row gap-8 justify-center py-4 items-center");
    			add_location(div2, file$1, 49, 2, 1416);
    			attr_dev(div3, "class", "bg-no-repeat bg-cover bg-center");
    			add_location(div3, file$1, 48, 0, 1368);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, h3);
    			append_dev(h3, t2);
    			append_dev(div0, t3);
    			append_dev(div0, p0);
    			append_dev(p0, t4);
    			append_dev(div0, t5);
    			append_dev(div0, p1);
    			append_dev(p1, t6);
    			append_dev(div1, t7);
    			append_dev(div1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*prev*/ ctx[4], false, false, false, false),
    					listen_dev(button1, "click", /*next*/ ctx[3], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t2, /*name*/ ctx[0]);
    			if (dirty & /*role*/ 2) set_data_dev(t4, /*role*/ ctx[1]);
    			if (dirty & /*testimonial*/ 4) set_data_dev(t6, /*testimonial*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Testimonials', slots, []);
    	let currentIndex = 0;
    	let name = 'John Doe';
    	let role = 'CEO, Company XYZ';
    	let testimonial = '"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."';

    	const testimonials = [
    		{
    			name: 'John Doe',
    			role: 'CEO, Company XYZ',
    			comment: '"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."'
    		},
    		{
    			name: 'Jane Doe',
    			role: 'Manager, ABC Inc.',
    			comment: '"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."'
    		},
    		{
    			name: 'Alex Smith',
    			role: 'Professor, University X',
    			comment: '"Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."'
    		}
    	];

    	function next() {
    		currentIndex++;

    		if (currentIndex >= testimonials.length) {
    			currentIndex = 0;
    		}

    		updateTestimonial();
    	}

    	function prev() {
    		currentIndex--;

    		if (currentIndex < 0) {
    			currentIndex = testimonials.length - 1;
    		}

    		updateTestimonial();
    	}

    	function updateTestimonial() {
    		$$invalidate(0, name = testimonials[currentIndex].name);
    		$$invalidate(1, role = testimonials[currentIndex].role);
    		$$invalidate(2, testimonial = testimonials[currentIndex].comment);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Testimonials> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		currentIndex,
    		name,
    		role,
    		testimonial,
    		testimonials,
    		next,
    		prev,
    		updateTestimonial
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentIndex' in $$props) currentIndex = $$props.currentIndex;
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('role' in $$props) $$invalidate(1, role = $$props.role);
    		if ('testimonial' in $$props) $$invalidate(2, testimonial = $$props.testimonial);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, role, testimonial, next, prev];
    }

    class Testimonials extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Testimonials",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Resume.svelte generated by Svelte v3.59.2 */
    const file = "src/Resume.svelte";

    // (104:49) 
    function create_if_block_1(ctx) {
    	let experience;
    	let current;
    	experience = new Experience({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(experience.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(experience, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(experience.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(experience.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(experience, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(104:49) ",
    		ctx
    	});

    	return block;
    }

    // (102:12) {#if activeTab === 'education'}
    function create_if_block(ctx) {
    	let education;
    	let current;
    	education = new Education({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(education.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(education, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(education.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(education.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(education, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(102:12) {#if activeTab === 'education'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let head;
    	let meta0;
    	let t0;
    	let meta1;
    	let t1;
    	let title;
    	let t3;
    	let link;
    	let t4;
    	let body;
    	let div0;
    	let header;
    	let t5;
    	let div9;
    	let div5;
    	let div4;
    	let div3;
    	let div1;
    	let skills;
    	let t6;
    	let div2;
    	let languageschart;
    	let t7;
    	let testimonials;
    	let t8;
    	let div7;
    	let div6;
    	let button0;
    	let t9;
    	let button0_class_value;
    	let t10;
    	let button1;
    	let t11;
    	let button1_class_value;
    	let t12;
    	let current_block_type_index;
    	let if_block;
    	let t13;
    	let div8;
    	let contactform;
    	let div9_class_value;
    	let t14;
    	let button2;
    	let t15_value = (/*isDarkMode*/ ctx[0] ? 'Light Mode' : 'Dark Mode') + "";
    	let t15;
    	let t16;
    	let footer;
    	let body_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	header = new Header({ $$inline: true });
    	skills = new Skills({ $$inline: true });

    	languageschart = new LanguagesChart({
    			props: { languages: /*languages*/ ctx[4] },
    			$$inline: true
    		});

    	testimonials = new Testimonials({ $$inline: true });
    	const if_block_creators = [create_if_block, create_if_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*activeTab*/ ctx[1] === 'education') return 0;
    		if (/*activeTab*/ ctx[1] === 'experience') return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	contactform = new ContactForm({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			head = element("head");
    			meta0 = element("meta");
    			t0 = space();
    			meta1 = element("meta");
    			t1 = space();
    			title = element("title");
    			title.textContent = "Resume";
    			t3 = space();
    			link = element("link");
    			t4 = space();
    			body = element("body");
    			div0 = element("div");
    			create_component(header.$$.fragment);
    			t5 = space();
    			div9 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			create_component(skills.$$.fragment);
    			t6 = space();
    			div2 = element("div");
    			create_component(languageschart.$$.fragment);
    			t7 = space();
    			create_component(testimonials.$$.fragment);
    			t8 = space();
    			div7 = element("div");
    			div6 = element("div");
    			button0 = element("button");
    			t9 = text("Education");
    			t10 = space();
    			button1 = element("button");
    			t11 = text("Experience");
    			t12 = space();
    			if (if_block) if_block.c();
    			t13 = space();
    			div8 = element("div");
    			create_component(contactform.$$.fragment);
    			t14 = space();
    			button2 = element("button");
    			t15 = text(t15_value);
    			t16 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(meta0, "charset", "UTF-8");
    			add_location(meta0, file, 51, 2, 1382);
    			attr_dev(meta1, "name", "viewport");
    			attr_dev(meta1, "content", "width=device-width, initial-scale=0.8");
    			add_location(meta1, file, 52, 2, 1407);
    			add_location(title, file, 53, 2, 1480);
    			attr_dev(link, "href", "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css");
    			attr_dev(link, "rel", "stylesheet");
    			add_location(link, file, 55, 2, 1549);
    			add_location(head, file, 50, 0, 1373);
    			add_location(div0, file, 60, 1, 1725);
    			attr_dev(div1, "class", "flex-1 mr-6");
    			add_location(div1, file, 71, 20, 2045);
    			attr_dev(div2, "class", "flex-1");
    			add_location(div2, file, 76, 20, 2201);
    			attr_dev(div3, "class", "flex mb-6");
    			add_location(div3, file, 69, 16, 1953);
    			attr_dev(div4, "class", "md:col-span-1 flex flex-col");
    			add_location(div4, file, 68, 12, 1895);
    			attr_dev(div5, "class", "md:col-span-2 flex flex-col");
    			add_location(div5, file, 66, 8, 1840);

    			attr_dev(button0, "class", button0_class_value = "" + ((/*activeTab*/ ctx[1] === 'education'
    			? 'bg-blue-300'
    			: 'bg-white') + " text-2xl font-bold mb-2 mr-4 focus:outline-none px-4 py-2 rounded-md"));

    			add_location(button0, file, 90, 16, 2556);

    			attr_dev(button1, "class", button1_class_value = "" + ((/*activeTab*/ ctx[1] === 'experience'
    			? 'bg-blue-300'
    			: 'bg-white') + " text-2xl font-bold mb-2 mr-4 focus:outline-none px-4 py-2 rounded-md"));

    			add_location(button1, file, 94, 16, 2836);
    			attr_dev(div6, "class", "flex mb-3");
    			add_location(div6, file, 89, 12, 2516);
    			attr_dev(div7, "class", "md:col-span-3");
    			add_location(div7, file, 86, 8, 2442);
    			attr_dev(div8, "class", "md:col-span-2 items-center");
    			add_location(div8, file, 110, 8, 3397);
    			attr_dev(div9, "class", div9_class_value = "grid lg:grid-cols-7 gap-6 px-6 " + (/*isDarkMode*/ ctx[0] ? 'dark' : '') + " svelte-9mskxj");
    			add_location(div9, file, 64, 4, 1759);
    			attr_dev(button2, "class", "fixed bottom-16 right-8 px-4 py-2 rounded-md bg-gray-900 text-white");
    			add_location(button2, file, 117, 4, 3535);
    			attr_dev(body, "class", body_class_value = "left-0 right-0 " + (/*isDarkMode*/ ctx[0] ? 'dark' : '') + " svelte-9mskxj");
    			add_location(body, file, 58, 0, 1664);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, head, anchor);
    			append_dev(head, meta0);
    			append_dev(head, t0);
    			append_dev(head, meta1);
    			append_dev(head, t1);
    			append_dev(head, title);
    			append_dev(head, t3);
    			append_dev(head, link);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, body, anchor);
    			append_dev(body, div0);
    			mount_component(header, div0, null);
    			append_dev(body, t5);
    			append_dev(body, div9);
    			append_dev(div9, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			mount_component(skills, div1, null);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			mount_component(languageschart, div2, null);
    			append_dev(div4, t7);
    			mount_component(testimonials, div4, null);
    			append_dev(div9, t8);
    			append_dev(div9, div7);
    			append_dev(div7, div6);
    			append_dev(div6, button0);
    			append_dev(button0, t9);
    			append_dev(div6, t10);
    			append_dev(div6, button1);
    			append_dev(button1, t11);
    			append_dev(div7, t12);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div7, null);
    			}

    			append_dev(div9, t13);
    			append_dev(div9, div8);
    			mount_component(contactform, div8, null);
    			append_dev(body, t14);
    			append_dev(body, button2);
    			append_dev(button2, t15);
    			append_dev(body, t16);
    			mount_component(footer, body, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[6], false, false, false, false),
    					listen_dev(button2, "click", /*toggleDarkMode*/ ctx[2], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*activeTab*/ 2 && button0_class_value !== (button0_class_value = "" + ((/*activeTab*/ ctx[1] === 'education'
    			? 'bg-blue-300'
    			: 'bg-white') + " text-2xl font-bold mb-2 mr-4 focus:outline-none px-4 py-2 rounded-md"))) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (!current || dirty & /*activeTab*/ 2 && button1_class_value !== (button1_class_value = "" + ((/*activeTab*/ ctx[1] === 'experience'
    			? 'bg-blue-300'
    			: 'bg-white') + " text-2xl font-bold mb-2 mr-4 focus:outline-none px-4 py-2 rounded-md"))) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(div7, null);
    				} else {
    					if_block = null;
    				}
    			}

    			if (!current || dirty & /*isDarkMode*/ 1 && div9_class_value !== (div9_class_value = "grid lg:grid-cols-7 gap-6 px-6 " + (/*isDarkMode*/ ctx[0] ? 'dark' : '') + " svelte-9mskxj")) {
    				attr_dev(div9, "class", div9_class_value);
    			}

    			if ((!current || dirty & /*isDarkMode*/ 1) && t15_value !== (t15_value = (/*isDarkMode*/ ctx[0] ? 'Light Mode' : 'Dark Mode') + "")) set_data_dev(t15, t15_value);

    			if (!current || dirty & /*isDarkMode*/ 1 && body_class_value !== (body_class_value = "left-0 right-0 " + (/*isDarkMode*/ ctx[0] ? 'dark' : '') + " svelte-9mskxj")) {
    				attr_dev(body, "class", body_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(skills.$$.fragment, local);
    			transition_in(languageschart.$$.fragment, local);
    			transition_in(testimonials.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(contactform.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(skills.$$.fragment, local);
    			transition_out(languageschart.$$.fragment, local);
    			transition_out(testimonials.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(contactform.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(head);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(body);
    			destroy_component(header);
    			destroy_component(skills);
    			destroy_component(languageschart);
    			destroy_component(testimonials);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			destroy_component(contactform);
    			destroy_component(footer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Resume', slots, []);
    	let isDarkMode = false; // Initialize white mode
    	let activeTab = 'education'; // Initialize active tab as 'education'

    	// Function to toggle dark mode
    	function toggleDarkMode() {
    		$$invalidate(0, isDarkMode = !isDarkMode);
    		document.body.classList.toggle('dark'); // Apply 'dark' class to body for dark mode
    	}

    	// Function to switch active tab
    	function switchTab(tab) {
    		$$invalidate(1, activeTab = tab);
    	}

    	let languages = [
    		{
    			name: 'Italian',
    			proficiency: 'Native',
    			level: 100
    		},
    		{
    			name: 'English',
    			proficiency: 'Fluent (C1)',
    			level: 90
    		},
    		{
    			name: 'Spanish',
    			proficiency: 'Intermediate',
    			level: 70
    		}
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Resume> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => switchTab('education');
    	const click_handler_1 = () => switchTab('experience');

    	$$self.$capture_state = () => ({
    		onMount,
    		Header,
    		ContactInfo: Contact_Info,
    		Skills,
    		Languages,
    		Education,
    		Experience,
    		Footer,
    		LanguagesChart,
    		ContactForm,
    		Testimonials,
    		isDarkMode,
    		activeTab,
    		toggleDarkMode,
    		switchTab,
    		languages
    	});

    	$$self.$inject_state = $$props => {
    		if ('isDarkMode' in $$props) $$invalidate(0, isDarkMode = $$props.isDarkMode);
    		if ('activeTab' in $$props) $$invalidate(1, activeTab = $$props.activeTab);
    		if ('languages' in $$props) $$invalidate(4, languages = $$props.languages);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		isDarkMode,
    		activeTab,
    		toggleDarkMode,
    		switchTab,
    		languages,
    		click_handler,
    		click_handler_1
    	];
    }

    class Resume extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Resume",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let resume;
    	let current;
    	resume = new Resume({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(resume.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(resume, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(resume.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(resume.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(resume, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Resume });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
