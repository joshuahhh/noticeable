import { memo } from "react";
import { Link } from "react-router-dom";

export const Root = memo(() => {
  return (
    <div className="prose p-6">
      <h1>Root</h1>
      <p>
        <Link to="/parse-and-transpile">parse & transpile</Link>
      </p>
      <p>
        <Link to="/cells">cells</Link>
      </p>
      <p>
        <Link to="/files">files</Link>
      </p>
    </div>
  );
});
