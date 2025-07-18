// Main grammar definition
BruEnvFile
  = OptionalNL* tags:(Vars / SecretVars)|.., STNL*| STNL* {
  if (!tags || !tags.length) {
    return {
      variables: []
    };
  }

  return options._.reduce(
    tags,
    (result, item) => {
      return options._.mergeWith(result, item, options.concatArrays);
    },
    {}
  );
}

NL "newline" = "\r"? "\n"
ST "space_or_tab" = [ \t]
STNL "space_or_tab_or_newline" = ST / NL
TagEnd = NL "}"
OptionalNL "optional_newline" = !TagEnd NL
KeyChar = !TagEnd !ST !NL !":" .
ValueChar = !NL !TagEnd .

// Dictionary Blocks
Dictionary = ST* "{" @PairList? TagEnd
PairList = OptionalNL* @Pair|.., PairDelimiter| PairDelimiter?
PairDelimiter = (!TagEnd STNL)*
Pair = ST* key:Key ST* ":" ST* value:Value {
  return {
    [key]: value?.trim() ?? ''
  };
}
Key = key:$(KeyChar*) {
  return key?.trim() ?? ''
}
Value = value:$(ValueChar*) {
  return value?.trim() ?? ''
}

// Array Blocks
Array = ST* "[" STNL* @ValueList STNL* "]"
ValueList = STNL* @ArrayValue|.., "," ArrayDelimiter| ArrayDelimiter?
ArrayDelimiter = "," / STNL*
ArrayValue = value:$(ArrayValueChar*) {
  return value?.trim() ?? ''
}
ArrayValueChar = !(NL / ST / "[" / "]" / ",") .

Vars = "vars" dict:Dictionary {
  const vars = options.mapPairListToKeyValPairs(dict);
  options._.each(vars, (v) => {
    v.secret = false;
  });
  return {
    variables: vars
  };
}

SecretVars = "vars:secret" values:Array {
  const vars = options.mapArrayListToKeyValPairs(values || []);
  options._.each(vars, (v) => {
    v.secret = true;
  });
  return {
    variables: vars
  };
}