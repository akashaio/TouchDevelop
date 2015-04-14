///<reference path='../refs.ts'/>

module TDev {

  export module Microbit {

    import J = AST.Json
    import H = Helpers

    class Lifter extends JsonAstVisitor<{}, J.JInlineAction[]> {

      public visitMany(e, ss: J.JNode[]) {
        return ss.reduce((as: J.JInlineAction[], s: J.JNode) => {
          return as.concat(this.visit({}, s));
        }, []);
      }

      // That's where we do the in-place modification.
      public visit(env, e: J.JNode) {
        var as = super.visit(env, e);
        if (e.nodeType == "inlineActions")
          e.nodeType = "exprStmt";
        return as;
      }

      public visitInlineActions(env, e: J.JExpr, actions: J.JInlineAction[]) {
        return this.visitMany(e, actions).concat(actions);
      }

      public visitAction(
        env,
        name: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[])
      {
        return this.visitMany(env, body);
      }

      public visitApp(e, decls: J.JDecl[]) {
        return this.visitMany(e, decls);
      }
    }

    // This function modifies in-place the AST it visits to lift all closures
    // (a.k.a. [JInlineAction]'s) out into top-level function definitions
    // (a.k.a. [JAction]'s). It assumes that these closures contain no free
    // variables, i.e. that closure-conversion has been performed already.
    export function lift(a: J.JApp) {
      var lambdas = (new Lifter()).visit({}, a).map((a: J.JInlineAction): J.JAction => {
        var name = H.mangleDef(a.reference);
        return {
          nodeType: "action",
          id: a.id,
          name: name,
          inParameters: a.inParameters,
          outParameters: a.outParameters,
          isPrivate: true,
          isOffline: false,
          isQuery: false,
          isTest: false,
          isAsync: false,
          description: "",
          body: a.body
        };
      });
      Array.prototype.push.apply(a.decls, lambdas);
    }
  }
}
