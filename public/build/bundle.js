
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
    function null_to_empty(value) {
        return value == null ? '' : value;
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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

    /* src\TodoFetch.svelte generated by Svelte v3.59.2 */

    const { Error: Error_1, console: console_1 } = globals;
    const file$1 = "src\\TodoFetch.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[19] = i;
    	return child_ctx;
    }

    // (169:0) {#if currentView === 'user'}
    function create_if_block_10(ctx) {
    	let div0;
    	let button0;
    	let t1;
    	let span;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let button1;
    	let t8;
    	let div2;
    	let p;
    	let t10;
    	let div1;
    	let mounted;
    	let dispose;
    	let each_value = Array(maxUserId);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "← Previous User";
    			t1 = space();
    			span = element("span");
    			t2 = text("User ");
    			t3 = text(/*currentUserId*/ ctx[7]);
    			t4 = text(" of ");
    			t5 = text(maxUserId);
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "Next User →";
    			t8 = space();
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Go to User:";
    			t10 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(button0, "class", "nav-button svelte-1i8yagn");
    			add_location(button0, file$1, 170, 4, 4755);
    			attr_dev(span, "class", "user-counter svelte-1i8yagn");
    			add_location(span, file$1, 171, 4, 4832);
    			attr_dev(button1, "class", "nav-button svelte-1i8yagn");
    			add_location(button1, file$1, 172, 4, 4907);
    			attr_dev(div0, "class", "user-navigation svelte-1i8yagn");
    			add_location(div0, file$1, 169, 2, 4720);
    			add_location(p, file$1, 177, 4, 5073);
    			attr_dev(div1, "class", "user-buttons svelte-1i8yagn");
    			add_location(div1, file$1, 178, 4, 5098);
    			attr_dev(div2, "class", "user-direct-access svelte-1i8yagn");
    			add_location(div2, file$1, 176, 2, 5035);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, button0);
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(span, t4);
    			append_dev(span, t5);
    			append_dev(div0, t6);
    			append_dev(div0, button1);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, p);
    			append_dev(div2, t10);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div1, null);
    				}
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*prevUser*/ ctx[13], false, false, false, false),
    					listen_dev(button1, "click", /*nextUser*/ ctx[12], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentUserId*/ 128) set_data_dev(t3, /*currentUserId*/ ctx[7]);

    			if (dirty & /*currentUserId, goToUser*/ 16512) {
    				each_value = Array(maxUserId);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(169:0) {#if currentView === 'user'}",
    		ctx
    	});

    	return block;
    }

    // (180:6) {#each Array(maxUserId) as _, i}
    function create_each_block(ctx) {
    	let button;
    	let t0_value = /*i*/ ctx[19] + 1 + "";
    	let t0;
    	let t1;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[16](/*i*/ ctx[19]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();

    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(/*currentUserId*/ ctx[7] === /*i*/ ctx[19] + 1
    			? 'active'
    			: '') + " svelte-1i8yagn"));

    			add_location(button, file$1, 180, 8, 5174);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_1, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*currentUserId*/ 128 && button_class_value !== (button_class_value = "" + (null_to_empty(/*currentUserId*/ ctx[7] === /*i*/ ctx[19] + 1
    			? 'active'
    			: '') + " svelte-1i8yagn"))) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(180:6) {#each Array(maxUserId) as _, i}",
    		ctx
    	});

    	return block;
    }

    // (245:0) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No data available";
    			add_location(p, file$1, 245, 2, 7348);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(245:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (222:41) 
    function create_if_block_9(ctx) {
    	let div2;
    	let h2;
    	let t0;
    	let t1_value = /*user*/ ctx[3].id + "";
    	let t1;
    	let t2;
    	let p0;
    	let strong0;
    	let t4;
    	let t5_value = /*user*/ ctx[3].name + "";
    	let t5;
    	let t6;
    	let p1;
    	let strong1;
    	let t8;
    	let t9_value = /*user*/ ctx[3].username + "";
    	let t9;
    	let t10;
    	let p2;
    	let strong2;
    	let t12;
    	let t13_value = /*user*/ ctx[3].email + "";
    	let t13;
    	let t14;
    	let div0;
    	let h30;
    	let t16;
    	let ul;
    	let li0;
    	let strong3;
    	let t18;
    	let t19_value = /*user*/ ctx[3].address.street + "";
    	let t19;
    	let t20;
    	let li1;
    	let strong4;
    	let t22;
    	let t23_value = /*user*/ ctx[3].address.suite + "";
    	let t23;
    	let t24;
    	let li2;
    	let strong5;
    	let t26;
    	let t27_value = /*user*/ ctx[3].address.city + "";
    	let t27;
    	let t28;
    	let li3;
    	let strong6;
    	let t30;
    	let t31_value = /*user*/ ctx[3].address.zipcode + "";
    	let t31;
    	let t32;
    	let p3;
    	let strong7;
    	let t34;
    	let t35_value = /*user*/ ctx[3].phone + "";
    	let t35;
    	let t36;
    	let p4;
    	let strong8;
    	let t38;
    	let t39_value = /*user*/ ctx[3].website + "";
    	let t39;
    	let t40;
    	let div1;
    	let h31;
    	let t42;
    	let p5;
    	let strong9;
    	let t44;
    	let t45_value = /*user*/ ctx[3].company.name + "";
    	let t45;
    	let t46;
    	let p6;
    	let strong10;
    	let t48;
    	let t49_value = /*user*/ ctx[3].company.catchPhrase + "";
    	let t49;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			h2 = element("h2");
    			t0 = text("User #");
    			t1 = text(t1_value);
    			t2 = space();
    			p0 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Name:";
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			p1 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Username:";
    			t8 = space();
    			t9 = text(t9_value);
    			t10 = space();
    			p2 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Email:";
    			t12 = space();
    			t13 = text(t13_value);
    			t14 = space();
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Address:";
    			t16 = space();
    			ul = element("ul");
    			li0 = element("li");
    			strong3 = element("strong");
    			strong3.textContent = "Street:";
    			t18 = space();
    			t19 = text(t19_value);
    			t20 = space();
    			li1 = element("li");
    			strong4 = element("strong");
    			strong4.textContent = "Suite:";
    			t22 = space();
    			t23 = text(t23_value);
    			t24 = space();
    			li2 = element("li");
    			strong5 = element("strong");
    			strong5.textContent = "City:";
    			t26 = space();
    			t27 = text(t27_value);
    			t28 = space();
    			li3 = element("li");
    			strong6 = element("strong");
    			strong6.textContent = "Zipcode:";
    			t30 = space();
    			t31 = text(t31_value);
    			t32 = space();
    			p3 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Phone Number:";
    			t34 = space();
    			t35 = text(t35_value);
    			t36 = space();
    			p4 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Website:";
    			t38 = space();
    			t39 = text(t39_value);
    			t40 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Company:";
    			t42 = space();
    			p5 = element("p");
    			strong9 = element("strong");
    			strong9.textContent = "Name:";
    			t44 = space();
    			t45 = text(t45_value);
    			t46 = space();
    			p6 = element("p");
    			strong10 = element("strong");
    			strong10.textContent = "Catchphrase:";
    			t48 = space();
    			t49 = text(t49_value);
    			add_location(h2, file$1, 223, 4, 6494);
    			add_location(strong0, file$1, 224, 7, 6527);
    			add_location(p0, file$1, 224, 4, 6524);
    			add_location(strong1, file$1, 225, 7, 6574);
    			add_location(p1, file$1, 225, 4, 6571);
    			add_location(strong2, file$1, 226, 7, 6629);
    			add_location(p2, file$1, 226, 4, 6626);
    			attr_dev(h30, "class", "svelte-1i8yagn");
    			add_location(h30, file$1, 228, 6, 6709);
    			add_location(strong3, file$1, 230, 12, 6752);
    			attr_dev(li0, "class", "svelte-1i8yagn");
    			add_location(li0, file$1, 230, 8, 6748);
    			add_location(strong4, file$1, 231, 12, 6817);
    			attr_dev(li1, "class", "svelte-1i8yagn");
    			add_location(li1, file$1, 231, 8, 6813);
    			add_location(strong5, file$1, 232, 12, 6880);
    			attr_dev(li2, "class", "svelte-1i8yagn");
    			add_location(li2, file$1, 232, 8, 6876);
    			add_location(strong6, file$1, 233, 12, 6941);
    			attr_dev(li3, "class", "svelte-1i8yagn");
    			add_location(li3, file$1, 233, 8, 6937);
    			attr_dev(ul, "class", "svelte-1i8yagn");
    			add_location(ul, file$1, 229, 6, 6734);
    			attr_dev(div0, "class", "address-info svelte-1i8yagn");
    			add_location(div0, file$1, 227, 4, 6675);
    			add_location(strong7, file$1, 236, 7, 7028);
    			add_location(p3, file$1, 236, 4, 7025);
    			add_location(strong8, file$1, 237, 7, 7084);
    			add_location(p4, file$1, 237, 4, 7081);
    			attr_dev(h31, "class", "svelte-1i8yagn");
    			add_location(h31, file$1, 239, 6, 7168);
    			add_location(strong9, file$1, 240, 9, 7196);
    			add_location(p5, file$1, 240, 6, 7193);
    			add_location(strong10, file$1, 241, 9, 7253);
    			add_location(p6, file$1, 241, 6, 7250);
    			attr_dev(div1, "class", "company-info svelte-1i8yagn");
    			add_location(div1, file$1, 238, 4, 7134);
    			attr_dev(div2, "class", "data-card svelte-1i8yagn");
    			add_location(div2, file$1, 222, 2, 6465);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h2);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			append_dev(div2, t2);
    			append_dev(div2, p0);
    			append_dev(p0, strong0);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			append_dev(div2, t6);
    			append_dev(div2, p1);
    			append_dev(p1, strong1);
    			append_dev(p1, t8);
    			append_dev(p1, t9);
    			append_dev(div2, t10);
    			append_dev(div2, p2);
    			append_dev(p2, strong2);
    			append_dev(p2, t12);
    			append_dev(p2, t13);
    			append_dev(div2, t14);
    			append_dev(div2, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t16);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, strong3);
    			append_dev(li0, t18);
    			append_dev(li0, t19);
    			append_dev(ul, t20);
    			append_dev(ul, li1);
    			append_dev(li1, strong4);
    			append_dev(li1, t22);
    			append_dev(li1, t23);
    			append_dev(ul, t24);
    			append_dev(ul, li2);
    			append_dev(li2, strong5);
    			append_dev(li2, t26);
    			append_dev(li2, t27);
    			append_dev(ul, t28);
    			append_dev(ul, li3);
    			append_dev(li3, strong6);
    			append_dev(li3, t30);
    			append_dev(li3, t31);
    			append_dev(div2, t32);
    			append_dev(div2, p3);
    			append_dev(p3, strong7);
    			append_dev(p3, t34);
    			append_dev(p3, t35);
    			append_dev(div2, t36);
    			append_dev(div2, p4);
    			append_dev(p4, strong8);
    			append_dev(p4, t38);
    			append_dev(p4, t39);
    			append_dev(div2, t40);
    			append_dev(div2, div1);
    			append_dev(div1, h31);
    			append_dev(div1, t42);
    			append_dev(div1, p5);
    			append_dev(p5, strong9);
    			append_dev(p5, t44);
    			append_dev(p5, t45);
    			append_dev(div1, t46);
    			append_dev(div1, p6);
    			append_dev(p6, strong10);
    			append_dev(p6, t48);
    			append_dev(p6, t49);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*user*/ 8 && t1_value !== (t1_value = /*user*/ ctx[3].id + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*user*/ 8 && t5_value !== (t5_value = /*user*/ ctx[3].name + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*user*/ 8 && t9_value !== (t9_value = /*user*/ ctx[3].username + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*user*/ 8 && t13_value !== (t13_value = /*user*/ ctx[3].email + "")) set_data_dev(t13, t13_value);
    			if (dirty & /*user*/ 8 && t19_value !== (t19_value = /*user*/ ctx[3].address.street + "")) set_data_dev(t19, t19_value);
    			if (dirty & /*user*/ 8 && t23_value !== (t23_value = /*user*/ ctx[3].address.suite + "")) set_data_dev(t23, t23_value);
    			if (dirty & /*user*/ 8 && t27_value !== (t27_value = /*user*/ ctx[3].address.city + "")) set_data_dev(t27, t27_value);
    			if (dirty & /*user*/ 8 && t31_value !== (t31_value = /*user*/ ctx[3].address.zipcode + "")) set_data_dev(t31, t31_value);
    			if (dirty & /*user*/ 8 && t35_value !== (t35_value = /*user*/ ctx[3].phone + "")) set_data_dev(t35, t35_value);
    			if (dirty & /*user*/ 8 && t39_value !== (t39_value = /*user*/ ctx[3].website + "")) set_data_dev(t39, t39_value);
    			if (dirty & /*user*/ 8 && t45_value !== (t45_value = /*user*/ ctx[3].company.name + "")) set_data_dev(t45, t45_value);
    			if (dirty & /*user*/ 8 && t49_value !== (t49_value = /*user*/ ctx[3].company.catchPhrase + "")) set_data_dev(t49, t49_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(222:41) ",
    		ctx
    	});

    	return block;
    }

    // (215:47) 
    function create_if_block_8(ctx) {
    	let div;
    	let h2;
    	let t0;
    	let t1_value = /*comment*/ ctx[2].id + "";
    	let t1;
    	let t2;
    	let p0;
    	let strong0;
    	let t4;
    	let t5_value = /*comment*/ ctx[2].name + "";
    	let t5;
    	let t6;
    	let p1;
    	let strong1;
    	let t8;
    	let t9_value = /*comment*/ ctx[2].email + "";
    	let t9;
    	let t10;
    	let p2;
    	let strong2;
    	let t12;
    	let t13_value = /*comment*/ ctx[2].body + "";
    	let t13;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text("Comment #");
    			t1 = text(t1_value);
    			t2 = space();
    			p0 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Name:";
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			p1 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Email:";
    			t8 = space();
    			t9 = text(t9_value);
    			t10 = space();
    			p2 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Body:";
    			t12 = space();
    			t13 = text(t13_value);
    			add_location(h2, file$1, 216, 4, 6226);
    			add_location(strong0, file$1, 217, 7, 6265);
    			add_location(p0, file$1, 217, 4, 6262);
    			add_location(strong1, file$1, 218, 7, 6315);
    			add_location(p1, file$1, 218, 4, 6312);
    			add_location(strong2, file$1, 219, 7, 6367);
    			add_location(p2, file$1, 219, 4, 6364);
    			attr_dev(div, "class", "data-card svelte-1i8yagn");
    			add_location(div, file$1, 215, 2, 6197);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			append_dev(div, t2);
    			append_dev(div, p0);
    			append_dev(p0, strong0);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			append_dev(div, t6);
    			append_dev(div, p1);
    			append_dev(p1, strong1);
    			append_dev(p1, t8);
    			append_dev(p1, t9);
    			append_dev(div, t10);
    			append_dev(div, p2);
    			append_dev(p2, strong2);
    			append_dev(p2, t12);
    			append_dev(p2, t13);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*comment*/ 4 && t1_value !== (t1_value = /*comment*/ ctx[2].id + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*comment*/ 4 && t5_value !== (t5_value = /*comment*/ ctx[2].name + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*comment*/ 4 && t9_value !== (t9_value = /*comment*/ ctx[2].email + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*comment*/ 4 && t13_value !== (t13_value = /*comment*/ ctx[2].body + "")) set_data_dev(t13, t13_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(215:47) ",
    		ctx
    	});

    	return block;
    }

    // (208:41) 
    function create_if_block_7(ctx) {
    	let div;
    	let h2;
    	let t0;
    	let t1_value = /*post*/ ctx[1].id + "";
    	let t1;
    	let t2;
    	let p0;
    	let strong0;
    	let t4;
    	let t5_value = /*post*/ ctx[1].title + "";
    	let t5;
    	let t6;
    	let p1;
    	let strong1;
    	let t8;
    	let t9_value = /*post*/ ctx[1].body + "";
    	let t9;
    	let t10;
    	let p2;
    	let strong2;
    	let t12;
    	let t13_value = /*post*/ ctx[1].userId + "";
    	let t13;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text("Post #");
    			t1 = text(t1_value);
    			t2 = space();
    			p0 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Title:";
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			p1 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Body:";
    			t8 = space();
    			t9 = text(t9_value);
    			t10 = space();
    			p2 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "User ID:";
    			t12 = space();
    			t13 = text(t13_value);
    			add_location(h2, file$1, 209, 4, 5962);
    			add_location(strong0, file$1, 210, 7, 5995);
    			add_location(p0, file$1, 210, 4, 5992);
    			add_location(strong1, file$1, 211, 7, 6044);
    			add_location(p1, file$1, 211, 4, 6041);
    			add_location(strong2, file$1, 212, 7, 6091);
    			add_location(p2, file$1, 212, 4, 6088);
    			attr_dev(div, "class", "data-card svelte-1i8yagn");
    			add_location(div, file$1, 208, 2, 5933);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			append_dev(div, t2);
    			append_dev(div, p0);
    			append_dev(p0, strong0);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			append_dev(div, t6);
    			append_dev(div, p1);
    			append_dev(p1, strong1);
    			append_dev(p1, t8);
    			append_dev(p1, t9);
    			append_dev(div, t10);
    			append_dev(div, p2);
    			append_dev(p2, strong2);
    			append_dev(p2, t12);
    			append_dev(p2, t13);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*post*/ 2 && t1_value !== (t1_value = /*post*/ ctx[1].id + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*post*/ 2 && t5_value !== (t5_value = /*post*/ ctx[1].title + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*post*/ 2 && t9_value !== (t9_value = /*post*/ ctx[1].body + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*post*/ 2 && t13_value !== (t13_value = /*post*/ ctx[1].userId + "")) set_data_dev(t13, t13_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(208:41) ",
    		ctx
    	});

    	return block;
    }

    // (201:41) 
    function create_if_block_6(ctx) {
    	let div;
    	let h2;
    	let t0;
    	let t1_value = /*todo*/ ctx[0].id + "";
    	let t1;
    	let t2;
    	let p0;
    	let strong0;
    	let t4;
    	let t5_value = /*todo*/ ctx[0].title + "";
    	let t5;
    	let t6;
    	let p1;
    	let strong1;
    	let t8;
    	let t9_value = (/*todo*/ ctx[0].completed ? 'Yes' : 'No') + "";
    	let t9;
    	let t10;
    	let p2;
    	let strong2;
    	let t12;
    	let t13_value = /*todo*/ ctx[0].userId + "";
    	let t13;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text("Todo #");
    			t1 = text(t1_value);
    			t2 = space();
    			p0 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Title:";
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			p1 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Completed:";
    			t8 = space();
    			t9 = text(t9_value);
    			t10 = space();
    			p2 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "User ID:";
    			t12 = space();
    			t13 = text(t13_value);
    			add_location(h2, file$1, 202, 4, 5679);
    			add_location(strong0, file$1, 203, 7, 5712);
    			add_location(p0, file$1, 203, 4, 5709);
    			add_location(strong1, file$1, 204, 7, 5761);
    			add_location(p1, file$1, 204, 4, 5758);
    			add_location(strong2, file$1, 205, 7, 5833);
    			add_location(p2, file$1, 205, 4, 5830);
    			attr_dev(div, "class", "data-card svelte-1i8yagn");
    			add_location(div, file$1, 201, 2, 5650);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			append_dev(div, t2);
    			append_dev(div, p0);
    			append_dev(p0, strong0);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			append_dev(div, t6);
    			append_dev(div, p1);
    			append_dev(p1, strong1);
    			append_dev(p1, t8);
    			append_dev(p1, t9);
    			append_dev(div, t10);
    			append_dev(div, p2);
    			append_dev(p2, strong2);
    			append_dev(p2, t12);
    			append_dev(p2, t13);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*todo*/ 1 && t1_value !== (t1_value = /*todo*/ ctx[0].id + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*todo*/ 1 && t5_value !== (t5_value = /*todo*/ ctx[0].title + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*todo*/ 1 && t9_value !== (t9_value = (/*todo*/ ctx[0].completed ? 'Yes' : 'No') + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*todo*/ 1 && t13_value !== (t13_value = /*todo*/ ctx[0].userId + "")) set_data_dev(t13, t13_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(201:41) ",
    		ctx
    	});

    	return block;
    }

    // (197:16) 
    function create_if_block_5(ctx) {
    	let div;
    	let p;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text("Error: ");
    			t1 = text(/*error*/ ctx[5]);
    			attr_dev(p, "class", "error svelte-1i8yagn");
    			add_location(p, file$1, 198, 4, 5558);
    			attr_dev(div, "class", "error-container svelte-1i8yagn");
    			add_location(div, file$1, 197, 2, 5523);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 32) set_data_dev(t1, /*error*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(197:16) ",
    		ctx
    	});

    	return block;
    }

    // (192:0) {#if loading}
    function create_if_block_4(ctx) {
    	let div1;
    	let p;
    	let t1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			p = element("p");
    			p.textContent = "Loading data...";
    			t1 = space();
    			div0 = element("div");
    			add_location(p, file$1, 193, 4, 5436);
    			attr_dev(div0, "class", "spinner svelte-1i8yagn");
    			add_location(div0, file$1, 194, 4, 5464);
    			attr_dev(div1, "class", "loading-container svelte-1i8yagn");
    			add_location(div1, file$1, 192, 2, 5399);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(192:0) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (257:37) 
    function create_if_block_3(ctx) {
    	let code;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			code = element("code");
    			t0 = text("jsonplaceholder.typicode.com/users/");
    			t1 = text(/*currentUserId*/ ctx[7]);
    			attr_dev(code, "class", "svelte-1i8yagn");
    			add_location(code, file$1, 257, 6, 7771);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, code, anchor);
    			append_dev(code, t0);
    			append_dev(code, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentUserId*/ 128) set_data_dev(t1, /*currentUserId*/ ctx[7]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(code);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(257:37) ",
    		ctx
    	});

    	return block;
    }

    // (255:40) 
    function create_if_block_2(ctx) {
    	let code;

    	const block = {
    		c: function create() {
    			code = element("code");
    			code.textContent = "jsonplaceholder.typicode.com/comments/1";
    			attr_dev(code, "class", "svelte-1i8yagn");
    			add_location(code, file$1, 255, 6, 7672);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, code, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(code);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(255:40) ",
    		ctx
    	});

    	return block;
    }

    // (253:37) 
    function create_if_block_1(ctx) {
    	let code;

    	const block = {
    		c: function create() {
    			code = element("code");
    			code.textContent = "jsonplaceholder.typicode.com/posts/1";
    			attr_dev(code, "class", "svelte-1i8yagn");
    			add_location(code, file$1, 253, 6, 7573);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, code, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(code);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(253:37) ",
    		ctx
    	});

    	return block;
    }

    // (251:4) {#if currentView === 'todo'}
    function create_if_block(ctx) {
    	let code;

    	const block = {
    		c: function create() {
    			code = element("code");
    			code.textContent = "jsonplaceholder.typicode.com/todos/1";
    			attr_dev(code, "class", "svelte-1i8yagn");
    			add_location(code, file$1, 251, 6, 7477);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, code, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(code);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(251:4) {#if currentView === 'todo'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let button0;
    	let t2;
    	let button0_class_value;
    	let t3;
    	let button1;
    	let t4;
    	let button1_class_value;
    	let t5;
    	let button2;
    	let t6;
    	let button2_class_value;
    	let t7;
    	let button3;
    	let t8;
    	let button3_class_value;
    	let t9;
    	let t10;
    	let t11;
    	let div1;
    	let p;
    	let t12;
    	let mounted;
    	let dispose;
    	let if_block0 = /*currentView*/ ctx[6] === 'user' && create_if_block_10(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[4]) return create_if_block_4;
    		if (/*error*/ ctx[5]) return create_if_block_5;
    		if (/*currentView*/ ctx[6] === 'todo' && /*todo*/ ctx[0]) return create_if_block_6;
    		if (/*currentView*/ ctx[6] === 'post' && /*post*/ ctx[1]) return create_if_block_7;
    		if (/*currentView*/ ctx[6] === 'comment' && /*comment*/ ctx[2]) return create_if_block_8;
    		if (/*currentView*/ ctx[6] === 'user' && /*user*/ ctx[3]) return create_if_block_9;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*currentView*/ ctx[6] === 'todo') return create_if_block;
    		if (/*currentView*/ ctx[6] === 'post') return create_if_block_1;
    		if (/*currentView*/ ctx[6] === 'comment') return create_if_block_2;
    		if (/*currentView*/ ctx[6] === 'user') return create_if_block_3;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block2 = current_block_type_1 && current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Contoh Fetch API dengan Svelte";
    			t1 = space();
    			div0 = element("div");
    			button0 = element("button");
    			t2 = text("Fetch Todo Data");
    			t3 = space();
    			button1 = element("button");
    			t4 = text("Fetch Post Data");
    			t5 = space();
    			button2 = element("button");
    			t6 = text("Fetch Comment Data");
    			t7 = space();
    			button3 = element("button");
    			t8 = text("Fetch User Data");
    			t9 = space();
    			if (if_block0) if_block0.c();
    			t10 = space();
    			if_block1.c();
    			t11 = space();
    			div1 = element("div");
    			p = element("p");
    			t12 = text("Current endpoint: \r\n    ");
    			if (if_block2) if_block2.c();
    			attr_dev(h1, "class", "svelte-1i8yagn");
    			add_location(h1, file$1, 149, 0, 4057);
    			attr_dev(button0, "class", button0_class_value = "" + (null_to_empty(/*currentView*/ ctx[6] === 'todo' ? 'active' : '') + " svelte-1i8yagn"));
    			add_location(button0, file$1, 153, 2, 4155);
    			attr_dev(button1, "class", button1_class_value = "" + (null_to_empty(/*currentView*/ ctx[6] === 'post' ? 'active' : '') + " svelte-1i8yagn"));
    			add_location(button1, file$1, 156, 2, 4269);
    			attr_dev(button2, "class", button2_class_value = "" + (null_to_empty(/*currentView*/ ctx[6] === 'comment' ? 'active' : '') + " svelte-1i8yagn"));
    			add_location(button2, file$1, 159, 2, 4383);
    			attr_dev(button3, "class", button3_class_value = "" + (null_to_empty(/*currentView*/ ctx[6] === 'user' ? 'active' : '') + " svelte-1i8yagn"));
    			add_location(button3, file$1, 162, 2, 4507);
    			attr_dev(div0, "class", "button-group svelte-1i8yagn");
    			add_location(div0, file$1, 152, 0, 4125);
    			add_location(p, file$1, 249, 2, 7414);
    			attr_dev(div1, "class", "endpoint-info svelte-1i8yagn");
    			add_location(div1, file$1, 248, 0, 7383);
    			attr_dev(main, "class", "svelte-1i8yagn");
    			add_location(main, file$1, 148, 0, 4049);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			append_dev(div0, button0);
    			append_dev(button0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(button1, t4);
    			append_dev(div0, t5);
    			append_dev(div0, button2);
    			append_dev(button2, t6);
    			append_dev(div0, t7);
    			append_dev(div0, button3);
    			append_dev(button3, t8);
    			append_dev(main, t9);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t10);
    			if_block1.m(main, null);
    			append_dev(main, t11);
    			append_dev(main, div1);
    			append_dev(div1, p);
    			append_dev(p, t12);
    			if (if_block2) if_block2.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*fetchTodo*/ ctx[8], false, false, false, false),
    					listen_dev(button1, "click", /*fetchPost*/ ctx[9], false, false, false, false),
    					listen_dev(button2, "click", /*fetchComments*/ ctx[10], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler*/ ctx[15], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentView*/ 64 && button0_class_value !== (button0_class_value = "" + (null_to_empty(/*currentView*/ ctx[6] === 'todo' ? 'active' : '') + " svelte-1i8yagn"))) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (dirty & /*currentView*/ 64 && button1_class_value !== (button1_class_value = "" + (null_to_empty(/*currentView*/ ctx[6] === 'post' ? 'active' : '') + " svelte-1i8yagn"))) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (dirty & /*currentView*/ 64 && button2_class_value !== (button2_class_value = "" + (null_to_empty(/*currentView*/ ctx[6] === 'comment' ? 'active' : '') + " svelte-1i8yagn"))) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (dirty & /*currentView*/ 64 && button3_class_value !== (button3_class_value = "" + (null_to_empty(/*currentView*/ ctx[6] === 'user' ? 'active' : '') + " svelte-1i8yagn"))) {
    				attr_dev(button3, "class", button3_class_value);
    			}

    			if (/*currentView*/ ctx[6] === 'user') {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_10(ctx);
    					if_block0.c();
    					if_block0.m(main, t10);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(main, t11);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if (if_block2) if_block2.d(1);
    				if_block2 = current_block_type_1 && current_block_type_1(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(p, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if_block1.d();

    			if (if_block2) {
    				if_block2.d();
    			}

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

    const maxUserId = 10;

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoFetch', slots, []);
    	let todo = null;
    	let post = null;
    	let comment = null;
    	let user = null;
    	let loading = true;
    	let error = null;

    	// Status untuk mengetahui data apa yang sedang ditampilkan
    	let currentView = 'todo';

    	// Variabel untuk menyimpan ID user yang sedang aktif
    	let currentUserId = 1;

    	// Function untuk mengambil data todo
    	async function fetchTodo() {
    		try {
    			$$invalidate(4, loading = true);
    			$$invalidate(6, currentView = 'todo');
    			$$invalidate(5, error = null);
    			const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');

    			// Periksa jika response OK
    			if (!response.ok) {
    				throw new Error(`HTTP error! Status: ${response.status}`);
    			}

    			// Parse JSON dari response
    			$$invalidate(0, todo = await response.json());

    			console.log('Todo data:', todo);
    		} catch(e) {
    			$$invalidate(5, error = e.message);
    			console.error('Fetch error:', e);
    		} finally {
    			$$invalidate(4, loading = false);
    		}
    	}

    	// Function untuk mengambil data post
    	async function fetchPost() {
    		try {
    			$$invalidate(4, loading = true);
    			$$invalidate(6, currentView = 'post');
    			$$invalidate(5, error = null);
    			const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');

    			// Periksa jika response OK
    			if (!response.ok) {
    				throw new Error(`HTTP error! Status: ${response.status}`);
    			}

    			// Parse JSON dari response
    			$$invalidate(1, post = await response.json());

    			console.log('Post data:', post);
    		} catch(e) {
    			$$invalidate(5, error = e.message);
    			console.error('Fetch error:', e);
    		} finally {
    			$$invalidate(4, loading = false);
    		}
    	}

    	// Function untuk mengambil data comment
    	async function fetchComments() {
    		try {
    			$$invalidate(4, loading = true);
    			$$invalidate(6, currentView = 'comment');
    			$$invalidate(5, error = null);
    			const response = await fetch('https://jsonplaceholder.typicode.com/comments/1');

    			// Periksa jika response OK
    			if (!response.ok) {
    				throw new Error(`HTTP error! Status: ${response.status}`);
    			}

    			// Parse JSON dari response
    			$$invalidate(2, comment = await response.json());

    			console.log('Comment data:', comment);
    		} catch(e) {
    			$$invalidate(5, error = e.message);
    			console.error('Fetch error:', e);
    		} finally {
    			$$invalidate(4, loading = false);
    		}
    	}

    	// Function untuk mengambil data user dengan ID tertentu
    	async function fetchUsers(id = 1) {
    		try {
    			$$invalidate(4, loading = true);
    			$$invalidate(6, currentView = 'user');
    			$$invalidate(5, error = null);
    			$$invalidate(7, currentUserId = id); // Update ID user yang sedang aktif
    			const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);

    			// Periksa jika response OK
    			if (!response.ok) {
    				throw new Error(`HTTP error! Status: ${response.status}`);
    			}

    			// Parse JSON dari response
    			$$invalidate(3, user = await response.json());

    			console.log(`User ${id} data:`, user);
    		} catch(e) {
    			$$invalidate(5, error = e.message);
    			console.error('Fetch error:', e);
    		} finally {
    			$$invalidate(4, loading = false);
    		}
    	}

    	// Function untuk mengambil user selanjutnya
    	function nextUser() {
    		// Increment ID user dan pastikan tidak lebih dari maxUserId
    		const nextId = currentUserId >= maxUserId ? 1 : currentUserId + 1;

    		fetchUsers(nextId);
    	}

    	// Function untuk mengambil user sebelumnya
    	function prevUser() {
    		// Decrement ID user dan pastikan tidak kurang dari 1
    		const prevId = currentUserId <= 1 ? maxUserId : currentUserId - 1;

    		fetchUsers(prevId);
    	}

    	// Function untuk mencari user dengan ID tertentu
    	function goToUser(id) {
    		// Pastikan ID berada dalam rentang yang valid
    		const validId = Math.max(1, Math.min(maxUserId, id));

    		fetchUsers(validId);
    	}

    	// Eksekusi fetch todo begitu komponen dimount
    	onMount(() => {
    		fetchTodo();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<TodoFetch> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => fetchUsers(1);
    	const click_handler_1 = i => goToUser(i + 1);

    	$$self.$capture_state = () => ({
    		onMount,
    		todo,
    		post,
    		comment,
    		user,
    		loading,
    		error,
    		currentView,
    		currentUserId,
    		maxUserId,
    		fetchTodo,
    		fetchPost,
    		fetchComments,
    		fetchUsers,
    		nextUser,
    		prevUser,
    		goToUser
    	});

    	$$self.$inject_state = $$props => {
    		if ('todo' in $$props) $$invalidate(0, todo = $$props.todo);
    		if ('post' in $$props) $$invalidate(1, post = $$props.post);
    		if ('comment' in $$props) $$invalidate(2, comment = $$props.comment);
    		if ('user' in $$props) $$invalidate(3, user = $$props.user);
    		if ('loading' in $$props) $$invalidate(4, loading = $$props.loading);
    		if ('error' in $$props) $$invalidate(5, error = $$props.error);
    		if ('currentView' in $$props) $$invalidate(6, currentView = $$props.currentView);
    		if ('currentUserId' in $$props) $$invalidate(7, currentUserId = $$props.currentUserId);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		todo,
    		post,
    		comment,
    		user,
    		loading,
    		error,
    		currentView,
    		currentUserId,
    		fetchTodo,
    		fetchPost,
    		fetchComments,
    		fetchUsers,
    		nextUser,
    		prevUser,
    		goToUser,
    		click_handler,
    		click_handler_1
    	];
    }

    class TodoFetch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoFetch",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.2 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let body;
    	let main;
    	let h1;
    	let t1;
    	let todofetch;
    	let current;
    	todofetch = new TodoFetch({ $$inline: true });

    	const block = {
    		c: function create() {
    			body = element("body");
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Aplikasi Svelte Saya";
    			t1 = space();
    			create_component(todofetch.$$.fragment);
    			attr_dev(h1, "class", "svelte-vjwu69");
    			add_location(h1, file, 6, 4, 86);
    			attr_dev(main, "class", "svelte-vjwu69");
    			add_location(main, file, 5, 2, 75);
    			attr_dev(body, "class", "svelte-vjwu69");
    			add_location(body, file, 4, 0, 66);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, body, anchor);
    			append_dev(body, main);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			mount_component(todofetch, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todofetch.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todofetch.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(body);
    			destroy_component(todofetch);
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

    	$$self.$capture_state = () => ({ TodoFetch });
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
    		name: 'Tekbum'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
