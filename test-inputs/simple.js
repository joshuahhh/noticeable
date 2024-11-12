// # My test notebook
// I hope you like it!

3 + 10;

const x = view(Inputs.range());

// now let's loop!

for (let i = 0; i < 3; i++) {
  display(i + x);
}

await new Promise((resolve) => setTimeout(resolve, 1000));
display(100000000);
await new Promise((resolve) => setTimeout(resolve, 1000));
display(2);
