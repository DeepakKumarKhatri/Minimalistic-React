const React = (() => {
  let hooks = [];
  let currentComponent = null;
  let currentHook = 0;

  return {
    createElement(type, props, ...children) {
      return { type, props: { ...props, children: children.flat() } };
    },
    useState(initialValue) {
      const component = currentComponent;
      const hookId = currentHook++;

      if (hooks[component.id] === undefined) {
        hooks[component.id] = [];
      }

      if (hooks[component.id][hookId] === undefined) {
        hooks[component.id][hookId] = initialValue;
      }

      const setState = (newValue) => {
        if (newValue !== hooks[component.id][hookId]) {
          hooks[component.id][hookId] = newValue;
          renderComponent(component);
        }
      };

      return [hooks[component.id][hookId], setState];
    },
    useEffect(callback, dependencies) {
      const component = currentComponent;
      const hookId = currentHook++;

      if (hooks[component.id] === undefined) {
        hooks[component.id] = [];
      }

      const oldDeps = hooks[component.id][hookId];
      let hasChanged = true;

      if (oldDeps) {
        hasChanged = dependencies.some((dep, i) => !Object.is(dep, oldDeps[i]));
      }

      if (hasChanged) {
        queueMicrotask(() => {
          const cleanup = callback();
          if (typeof cleanup === "function") {
            hooks[component.id][hookId] = { deps: dependencies, cleanup };
          } else {
            hooks[component.id][hookId] = { deps: dependencies };
          }
        });
      }
    },
    setCurrentComponent(component) {
      currentComponent = component;
      currentHook = 0;
    },
  };
})();

function renderComponent(component) {
  React.setCurrentComponent(component);
  const newVdom = component.render();
  const patch = diff(component.vdom, newVdom);
  patch(component.dom);
  component.vdom = newVdom;
}

function diff(oldVdom, newVdom) {
  // Handle case where either oldVdom or newVdom is undefined
  if (!oldVdom || !newVdom) {
    return (node) => {
      if (!newVdom) {
        node.remove();
        return null;
      }
      const newNode = createDOM(newVdom);
      if (node) {
        node.replaceWith(newNode);
      }
      return newNode;
    };
  }

  if (oldVdom === newVdom) {
    return (node) => node;
  }

  if (
    typeof oldVdom !== typeof newVdom ||
    (typeof oldVdom === "string" && oldVdom !== newVdom) ||
    oldVdom.type !== newVdom.type
  ) {
    return (node) => {
      const newNode = createDOM(newVdom);
      node.replaceWith(newNode);
      return newNode;
    };
  }

  if (typeof newVdom.type === "function") {
    return (node) => {
      const component = node._component;
      component.props = newVdom.props;
      const newVdomFromRender = component.render();
      const patch = diff(component.vdom, newVdomFromRender);
      patch(node);
      component.vdom = newVdomFromRender;
      return node;
    };
  }

  const patchChildren = diffChildren(
    oldVdom.props.children,
    newVdom.props.children
  );
  const patchAttributes = diffAttributes(oldVdom.props, newVdom.props);

  return (node) => {
    patchAttributes(node);
    patchChildren(node);
    return node;
  };
}

function diffChildren(oldChildren, newChildren) {
  const patches = [];

  const maxLength = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLength; i++) {
    patches.push(diff(oldChildren[i], newChildren[i]));
  }

  return (parent) => {
    patches.forEach((patch, i) => {
      const childNode = parent.childNodes[i];
      if (childNode) {
        patch(childNode);
      } else if (patch(null)) {
        parent.appendChild(patch(null));
      }
    });

    // Remove any extra old nodes
    while (parent.childNodes.length > newChildren.length) {
      parent.removeChild(parent.lastChild);
    }

    return parent;
  };
}

function diffAttributes(oldProps, newProps) {
  const patches = [];

  // Set new or changed attributes
  for (const [key, value] of Object.entries(newProps)) {
    patches.push((node) => {
      if (key === "children") return node;
      if (key.startsWith("on")) {
        const eventName = key.slice(2).toLowerCase();
        node.removeEventListener(eventName, oldProps[key]);
        node.addEventListener(eventName, value);
      } else if (value !== oldProps[key]) {
        node.setAttribute(key, value);
      }
      return node;
    });
  }

  // Remove old attributes
  for (const key in oldProps) {
    if (!(key in newProps)) {
      patches.push((node) => {
        if (key === "children") return node;
        if (key.startsWith("on")) {
          const eventName = key.slice(2).toLowerCase();
          node.removeEventListener(eventName, oldProps[key]);
        } else {
          node.removeAttribute(key);
        }
        return node;
      });
    }
  }

  return (node) => {
    patches.forEach((patch) => patch(node));
    return node;
  };
}

function createDOM(vdom) {
  if (typeof vdom === "string" || typeof vdom === "number") {
    return document.createTextNode(vdom);
  }

  if (typeof vdom.type === "function") {
    const component = {
      id: Date.now(),
      render: () => vdom.type(vdom.props),
      props: vdom.props,
    };
    React.setCurrentComponent(component);
    const componentVdom = component.render();
    const dom = createDOM(componentVdom);
    component.dom = dom;
    component.vdom = componentVdom;
    dom._component = component;
    return dom;
  }

  const dom = document.createElement(vdom.type);

  for (const [name, value] of Object.entries(vdom.props)) {
    if (name === "children") continue;
    if (name.startsWith("on")) {
      dom.addEventListener(name.slice(2).toLowerCase(), value);
    } else {
      dom.setAttribute(name, value);
    }
  }

  vdom.props.children.forEach((child) => dom.appendChild(createDOM(child)));

  return dom;
}
