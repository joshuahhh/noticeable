// # My test notebook
// I hope you like it!

const x = view(Inputs.range([0, 50]));

<svg width="100" height="100">
  <circle cx="50" cy="50" r={x} fill="red" />
</svg>;

// now let's loop!

for (let i = 0; i < 3; i++) {
  display(i + x);
}

await new Promise((resolve) => setTimeout(resolve, 1000));
display(100000000);
await new Promise((resolve) => setTimeout(resolve, 1000));
display(2);
