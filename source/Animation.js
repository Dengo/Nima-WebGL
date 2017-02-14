var Animation = (function ()
{
	function Animation(actor)
	{
		this._Actor = actor;
		this._Nodes = [];
		this._DisplayStart = 0;
		this._DisplayEnd = 0;

		this._Name = null;
		this._FPS = 60;
		this._Duration = 0;
		this._Loop = false;
	}

	function keyFrameLocation(seconds, list, start, end)
	{
		var mid;
		var element;
		while (start <= end) 
		{
	    	mid = ((start + end) >> 1);
			element = list[mid]._Time;
			if (element < seconds) 
			{
				start = mid + 1;
			} 
			else if (element > seconds) 
			{
				end = mid - 1;
			} 
			else 
			{
				return mid;
			}
		}
		return start;
	}

	Animation.prototype.apply = function(time, actor, mix)
	{
		var nodes = this._Nodes;
		var imix = 1.0-mix;
		var actorNodes = actor._Nodes;
		for(var i = 0; i < nodes.length; i++)
		{
			var animatedNode = nodes[i];
			var node = actorNodes[animatedNode._NodeIndex];
			if(!node)
			{
				continue;
			}
			var properties = animatedNode._Properties;
			for(var j = 0; j < properties.length; j++)
			{
				var property = properties[j];
				var keyFrames = property._KeyFrames;

				var kfl = keyFrames.length;
				if(kfl === 0)
				{
					continue;
				}

				var idx = keyFrameLocation(time, keyFrames, 0, keyFrames.length-1);
				var value = 0.0;

				if(idx === 0)
				{
					value = keyFrames[0]._Value;
				}
				else
				{
					if(idx < keyFrames.length)
					{
						var fromFrame = keyFrames[idx-1];
						var toFrame = keyFrames[idx];
						if(time == toFrame._Time)
						{
							value = toFrame._Value;
						}
						else
						{
							value = fromFrame.interpolate(time, toFrame);
						}
					}
					else
					{
						var kf = keyFrames[idx-1];
						value = kf._Value;
					}
				}

				var markDirty = false;
				switch(property._Type)
				{
					case AnimatedProperty.Properties.PosX:
						if(mix === 1.0)
						{
							node._Translation[0] = value;	
						}
						else
						{
							node._Translation[0] = node._Translation[0] * imix + value * mix;
						}
						
						markDirty = true;
						break;
					case AnimatedProperty.Properties.PosY:
						if(mix === 1.0)
						{
							node._Translation[1] = value;
						}
						else
						{
							node._Translation[1] = node._Translation[1] * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.ScaleX:
						if(mix === 1.0)
						{
							node._Scale[0] = value;
						}
						else
						{
							node._Scale[0] = value * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.ScaleY:
						if(mix === 1.0)
						{
							node._Scale[1] = value;
						}
						else
						{
							node._Scale[1] = value * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.Rotation:
						if(mix === 1.0)
						{
							node._Rotation = value;
						}
						else
						{
							node._Rotation = node._Rotation * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.Opacity:
						if(mix === 1.0)
						{
							node._Opacity = value;
						}
						else
						{
							node._Opacity = node._Opacity * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.IKStrength:
						if(mix === 1.0)
						{
							node._Strength = value;
						}
						else
						{
							node._Strength = node._Strength * imix + value * mix;	
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.DrawOrder:
						if(this._LastSetDrawOrder != value)
						{
							this._LastSetDrawOrder = value;
							for(var i = 0; i < value.length; i++)
							{
								var v = value[i];
								actorNodes[v.nodeIdx]._DrawOrder = v.value;
							}
							actor._IsImageSortDirty = true;
						}
						break;
					case AnimatedProperty.Properties.Length:
						markDirty = true;
						if(mix === 1.0)
						{
							node._Length = value;
						}
						else
						{
							node._Length = node._Length * imix + value * mix;
						}
						
						for(var l = 0; l < node._Children.length; l++)
						{
							var chd = node._Children[l];
							if(chd.constructor === ActorBone)
							{
								chd._Translation[0] = node._Length;
								chd._IsDirty = true;
							}
						}
						break;
					case AnimatedProperty.Properties.VertexDeform:
						node._VerticesDirty = true;
						var nv = node._NumVertices;
						var stride = node._VertexStride;
						var to = node._Vertices;
						var from = value;
						var tidx = 0;
						var fidx = 0;
						if(mix === 1.0)
						{
							for(var l = 0; l < nv; l++)
							{
								to[tidx] = value[fidx++];
								to[tidx+1] = value[fidx++];
								tidx += stride;
							}
						}
						else
						{
							for(var l = 0; l < nv; l++)
							{
								to[tidx] = to[tidx] * imix + value[fidx++] * mix;
								to[tidx+1] = to[tidx+1] * imix + value[fidx++] * mix;
								tidx += stride;
							}
						}
						break;
				}

				if(markDirty)
				{
					node._IsDirty = true;
					node.markWorldDirty();
				}
			}
		}
	};

	return Animation;
}());

var AnimatedNode = (function ()
{
	function AnimatedNode(nodeIndex)
	{
		this._NodeIndex = nodeIndex;
		this._Properties = [];
	}

	return AnimatedNode;
}());

var AnimatedProperty = (function ()
{
	function AnimatedProperty(type)
	{
		this._Type = type;
		this._KeyFrames = [];
	}

	AnimatedProperty.Properties = 
	{
		Unknown:0,
		PosX:1,
		PosY:2,
		ScaleX:3,
		ScaleY:4,
		Rotation:5,
		Opacity:6,
		DrawOrder:7,
		Length:8,
		VertexDeform:9,
		IKStrength:10
	};


	return AnimatedProperty;
}());

var KeyFrame = (function ()
{
	function KeyFrame()
	{
		this._Value = 0.0;
		this._Time = 0.0;
		this._Type = 0;
		this._InFactor = 0;
		this._InValue = 0;
		this._OutFactor = 0;
		this._OutValue = 0;
		this._Curve = null;
	}

	KeyFrame.Type =
	{
		Hold:0,
		Linear:1,
		Mirrored:2,
		Asymmetric:3,
		Disconnected:4,
		Progression:5
	};

	KeyFrame.prototype.setNext = function(nxt)
	{
		var t = this._Type;
		var ts = KeyFrame.Type;

		if(this._Value.constructor === Float32Array)
		{
			this._Curve = null;
			this._TmpBuffer = new Float32Array(this._Value.length);
			this.interpolate = KeyFrame.prototype.interpolateVertexBuffer;
		}
		else if(!nxt || (t === ts.Linear && nxt._type === ts.Linear) || t === ts.Hold)
		{
			this._Curve = null;
			this.interpolate = t === ts.Hold ? KeyFrame.prototype.interpolateHold : KeyFrame.prototype.interpolateLinear;
		}
		else
		{
			var timeRange = nxt._Time - this._Time;
			var outTime = this._Time + timeRange * this._OutFactor;
			var inTime = nxt._Time - timeRange * nxt._InFactor;

			this._Curve = new BezierAnimationCurve([this._Time, this._Value], [outTime, this._OutValue], [inTime, nxt._InValue], [nxt._Time, nxt._Value]);
			this.interpolate = KeyFrame.prototype.interpolateCurve;
		}
	};

	KeyFrame.prototype.interpolateVertexBuffer = function(t, nxt)
	{
		var mix = (t - this._Time)/(nxt._Time-this._Time);
		var mixi = 1.0 - mix;
		var wr = this._TmpBuffer;
		var from = this._Value;
		var to = nxt._Value;
		var l = to.length;

		for(var i = 0; i < l; i++)
		{
			wr[i] = from[i] * mixi + to[i] * mix;
		}

		return wr;
	};

	KeyFrame.prototype.interpolateHold = function(t, nxt)
	{
		return this._Value;
	};

	KeyFrame.prototype.interpolateCurve = function(t, nxt)
	{
		return this._Curve.get(t);
	};

	KeyFrame.prototype.interpolateLinear = function(t, nxt)
	{
		var mix = (t - this._Time)/(nxt._Time-this._Time);
		return this._Value * (1.0-mix) + nxt._Value * mix;
	};
	
	/*KeyFrame.prototype.interpolate = function(t, nxt)
	{
		if(this._Type === KeyFrame.Type.Hold)
		{
			return this._Value;
		}
		else if(!this._Curve)
		{	
			var mix = (t - this._Time)/(nxt._Time-this._Time);
			return this._Value * (1.0-mix) + nxt._Value * mix;
		}

		return this._Curve.get(t);
	};*/

	return KeyFrame;
}());

var AnimationInstance = (function ()
{
	function AnimationInstance(animation)
	{
		this._Animation = animation;
		this._Nodes = [];
		this._Time = 0;
		this._LastSetDrawOrder = null;

		this._Min = animation._DisplayStart;
		this._Max = animation._DisplayEnd;

		for(var i = 0; i < animation._Nodes.length; i++)
		{
			this._Nodes.push(new AnimatedNodeInstance(animation._Nodes[i]))		
		}
	}

	AnimationInstance.prototype.getTime = function()
	{
		return this._Time;
	};

	function keyFrameLocation(seconds, list, start, end)
	{
		var mid;
		var element;
		while (start <= end) 
		{
	    	mid = ((start + end) >> 1);
			element = list[mid]._Time;
			if (element < seconds) 
			{
				start = mid + 1;
			} 
			else if (element > seconds) 
			{
				end = mid - 1;
			} 
			else 
			{
				return mid;
			}
		}
		return start;
	}

	AnimationInstance.prototype.setTime = function(time, noLoop)
	{
		if(time < this._Min)
		{
			//time = this._Min;
			time = this._Max - (this._Min - time);
		}
		else if(this._Max && time > this._Max)
		{
			if(noLoop)
			{
				time = this._Max;
			}
			else
			{
				time = this._Min;
			}
		}

		this._Time = time;
	};

	AnimationInstance.prototype.apply = function(actor, mix)
	{
		var time = this._Time;
		var nodes = this._Nodes;
		var imix = 1.0-mix;
		for(var i = 0; i < nodes.length; i++)
		{
			var nodeInstance = nodes[i];
			var node = nodeInstance._Node;
			var properties = nodeInstance._Properties;
			for(var j = 0; j < properties.length; j++)
			{
				var propertyInstance = properties[j];
				var keyFrames = propertyInstance._Property._KeyFrames;

				var kfl = keyFrames.length;
				if(kfl === 0)
				{
					continue;
				}

				var idx = keyFrameLocation(time, keyFrames, 0, keyFrames.length-1);
				var value = 0.0;

				if(idx === 0)
				{
					value = keyFrames[0]._Value;
				}
				else
				{
					if(idx < keyFrames.length)
					{
						var fromFrame = keyFrames[idx-1];
						var toFrame = keyFrames[idx];
						if(time == toFrame._Time)
						{
							value = toFrame._Value;
						}
						else
						{
							value = fromFrame.interpolate(time, toFrame);
						}
					}
					else
					{
						var kf = keyFrames[idx-1];
						value = kf._Value;
					}
				}

				var markDirty = false;
				switch(propertyInstance._Property._Type)
				{
					case AnimatedProperty.Properties.PosX:
						if(mix === 1.0)
						{
							node._Translation[0] = value;	
						}
						else
						{
							node._Translation[0] = node._Translation[0] * imix + value * mix;
						}
						
						markDirty = true;
						break;
					case AnimatedProperty.Properties.PosY:
						if(mix === 1.0)
						{
							node._Translation[1] = value;
						}
						else
						{
							node._Translation[1] = node._Translation[1] * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.ScaleX:
						if(mix === 1.0)
						{
							node._Scale[0] = value;
						}
						else
						{
							node._Scale[0] = value * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.ScaleY:
						if(mix === 1.0)
						{
							node._Scale[1] = value;
						}
						else
						{
							node._Scale[1] = value * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.Rotation:
						if(mix === 1.0)
						{
							node._Rotation = value;
						}
						else
						{
							node._Rotation = node._Rotation * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.Opacity:
						if(mix === 1.0)
						{
							node._Opacity = value;
						}
						else
						{
							node._Opacity = node._Opacity * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.IKStrength:
						if(mix === 1.0)
						{
							node._Strength = value;
						}
						else
						{
							node._Strength = node._Strength * imix + value * mix;	
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.DrawOrder:
						if(this._LastSetDrawOrder != value)
						{
							this._LastSetDrawOrder = value;
							for(var i = 0; i < value.length; i++)
							{
								var v = value[i];
								v.node._DrawOrder = v.value;
							}
							actor._Images.sort(function(a,b)
							{
								return a._DrawOrder - b._DrawOrder;
							});
						}
						break;
					case AnimatedProperty.Properties.Length:
						markDirty = true;
						if(mix === 1.0)
						{
							node._Length = value;
						}
						else
						{
							node._Length = node._Length * imix + value * mix;
						}
						
						for(var l = 0; l < node._Children.length; l++)
						{
							var chd = node._Children[l];
							if(chd.constructor === ActorBone)
							{
								chd._Translation[0] = node._Length;
								chd._IsDirty = true;
							}
						}
						break;
					case AnimatedProperty.Properties.VertexDeform:
						node._VerticesDirty = true;
						var nv = node._NumVertices;
						var stride = node._VertexStride;
						var to = node._Vertices;
						var from = value;
						var tidx = 0;
						var fidx = 0;
						if(mix === 1.0)
						{
							for(var l = 0; l < nv; l++)
							{
								to[tidx] = value[fidx++];
								to[tidx+1] = value[fidx++];
								tidx += stride;
							}
						}
						else
						{
							for(var l = 0; l < nv; l++)
							{
								to[tidx] = to[tidx] * imix + value[fidx++] * mix;
								to[tidx+1] = to[tidx+1] * imix + value[fidx++] * mix;
								tidx += stride;
							}
						}
						break;
				}

				if(markDirty)
				{
					node._IsDirty = true;
					node.markWorldDirty();
				}
			}
		}
	};

	return AnimationInstance;
}());

var AnimatedNodeInstance = (function ()
{
	function AnimatedNodeInstance(node)
	{
		this._Node = node._Node;
		this._Properties = [];
		for(var i = 0; i < node._Properties.length; i++)
		{
			this._Properties.push(new AnimatedPropertyInstance(node._Properties[i]));
		}
	}

	return AnimatedNodeInstance;
}());

var AnimatedPropertyInstance = (function ()
{
	function AnimatedPropertyInstance(animatedProperty)
	{
		this._Property = animatedProperty;
		this._Value = 0;
		this._KeyFrameIndex = 0;
	}


	return AnimatedPropertyInstance;
}());