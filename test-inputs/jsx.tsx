/// <reference path="./types.ts" />

// # JSX test

<>hi</>;

<div>hi</div>;

display(<>hi</>);

display(<div>hi</div>);

const Stateful = ({ input }: { input: number }) => {
  const [state, setState] = React.useState(0);
  return (
    <>
      <button onClick={() => setState(state + 1)}>Increment</button>
      <div>{state}</div>
      input = {input}
    </>
  );
};

const x = 100;

x ** 1;

display(<Stateful input={x} />);
