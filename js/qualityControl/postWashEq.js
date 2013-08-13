{
	stringified: "Y = mx+b",
	func: function (xVector, params) {
		
		//Y = mx+b, params[0]=m, parmas[1]=b
		return params[0] * xVector[0] + params[1];
	},
	description: 'For fitting postwash data'
}