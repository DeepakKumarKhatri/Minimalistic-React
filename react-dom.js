const ReactDOM = {
  render(element, container) {
    const component = { id: Date.now(), render: () => element, props: {} };
    const vdom = component.render();
    const dom = createDOM(vdom);
    container.appendChild(dom);
    component.dom = dom;
    component.vdom = vdom;
  },
};

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
