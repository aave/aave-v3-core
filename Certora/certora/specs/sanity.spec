rule sanity(method f) {
	env e;
	calldataarg arg;
	sinvoke f(e, arg);
	assert false;
}