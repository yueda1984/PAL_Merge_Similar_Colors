/*
	Merge Similar Colors

	A Toon Boom Harmony shelf script for Merging color pots that are close in RGB values.
	The script meant to consolidate color palette after importing *.ai file created with auto-tracing in Adobe Illustrator.
	Any gradient and color pots with transparency will be ignored. The script is compatible with Harmony Premium 15 and up.
	
	v1.01 - "drawing.elementMode" attribute is changed to "drawing.ELEMENT_MODE" to accomodate Harmony 22 update.
	

	Installation:
	
	1) Download and Unarchive the zip file.
	2) Locate to your user scripts folder (a hidden folder):
	   https://docs.toonboom.com/help/harmony-17/premium/scripting/import-script.html
	   
	3) Add all unzipped files (*.js, *.ui, and script-icons folder) directly to the folder above.	
	4) Add PAL_Merge_Similar_Colors to any toolbar.

	
	Direction:
	
	1) In Colour view, select a palette in which has colors you want to merge similar color pots together.	   
	2) Run PAL_Merge_Similar_Colors.	
	3) On the dialog, Set maximum difference of RGB values between 1 and 255. This value will be used as a tolerance for merging color pots.
	
	
	Author:

		Yu Ueda
*/

function PAL_Merge_Similar_Colors()
{
	main_function();
	
	function main_function()	
	{
		var pf = new private_functions;
		
		var tolerance = pf.dialog();
		if (tolerance == -1)
		{
			return;
		}
			
		var paletteList = PaletteObjectManager.getScenePaletteList();	
		var paletteId = PaletteManager.getCurrentPaletteId();
		var palette = paletteList.getPaletteById(paletteId);

		// get each color id and RGB values. gradient and transparent colors get ignored
		var colors = [];	
		for (var c = 0; c < palette.nColors; c++)
		{
			var id = PaletteManager.getColorId(c);
			var color = palette.getColorById(id);
			
			if (color.colorType == 0 /*SOLID_COLOR*/ && color.colorData.a == 255)
			{
				colors.push(color);
			}
		}

		
		scene.beginUndoRedoAccum("Merge Similar Colors");	

		
		// compair 2 colors at time. if difference between the 2 is within tolerance, merge the second to first
		var checkedColors = [];
		var removeColors = [];
		for (var f = 0; f < colors.length; f++)
		{
			if (checkedColors.indexOf(colors[f].id) == -1)
			{
				for (var s = 1; s < colors.length; s++)
				{
					if (colors[f].id !== colors[s].id && checkedColors.indexOf(colors[s].id) == -1)
					{
						var diff_r = Math.abs(colors[f].colorData.r - colors[s].colorData.r);
						var diff_g = Math.abs(colors[f].colorData.g - colors[s].colorData.g);
						var diff_b = Math.abs(colors[f].colorData.b - colors[s].colorData.b);
						var diff_sum = diff_r + diff_g + diff_b;
						var diff_bar = (diff_r + diff_g + diff_b) /3;
						var dev_r = Math.abs(diff_r - diff_bar);
						var dev_g = Math.abs(diff_g - diff_bar);
						var dev_b = Math.abs(diff_b - diff_bar);						
						var max_dev = Math.max(dev_r, dev_g, dev_b);
						
						if (diff_sum <= tolerance && max_dev <= tolerance *0.15)
						{
							checkedColors.push(colors[s].id);
							
							// get nodes that use current color and the frame number
							var drawKeys = pf.getNodeColors(colors[s].id);
							for (var d = 0; d < drawKeys.length; d++)
							{							
								DrawingTools.recolorDrawing(drawKeys[d],[{from: colors[s].id, to: colors[f].id}]);
							}
							removeColors.push(colors[s].id);
						}
					}
				}
			}
			checkedColors.push(colors[f].id);
		}
		
		for (var r = 0; r < removeColors.length; r++)
		{
			palette.removeColor(removeColors[r]);
		}
		MessageLog.trace("Merged " + removeColors.length + " colors")
		
		
		scene.endUndoRedoAccum();	
	}


	
	function private_functions()
	{
		this.dialog = function()
		{
			var setNumBox = new Dialog;	
			setNumBox.title = "Merge Similar Colors";	
			setNumBox.addSpace(10);

			var userInput = new SpinBox();
			userInput.label = "Tolerance: ";	
			userInput.maximum = 255;
			userInput.minimum = 1;
			userInput.value = 8;

			setNumBox.add(userInput);
			setNumBox.addSpace(10);

			var rc = setNumBox.exec();
			if (!rc)
			{
				return -1;
			}
			else
			{
				return userInput.value *3;
			}
		}
		
		
		this.getNodeColors = function(colorId)
		{
			// Make list of colors used in the scene		
			var nodes = node.getNodes(["READ"]);
			
			var drawKey = [];		
			for (var n in nodes)
			{
				var useTiming = node.getAttr(nodes[n], 1, "drawing.ELEMENT_MODE").boolValue();
				var drawColumn = node.linkedColumn(nodes[n], useTiming ? "drawing.element" : "drawing.customName.timing");			
				var frames = this.getFrames(drawColumn);
				for (var f in frames)
				{
					var drawingColors = DrawingTools.getDrawingUsedColors({node: nodes[n], frame: frames[f]});
					for (var c in drawingColors)
					{
						if (drawingColors[c] == colorId && drawKey.indexOf(drawingColors[c]) == -1)
						{
							drawKey.push({node: nodes[n], frame: frames[f]});
						}
					}
				}
			}
			return drawKey;
		}

		
		this.getFrames = function(drawColumn)
		{
			var checkedCels = [], frameList = [];
			for (var f = 1; f <= frame.numberOf(); f++)
			{
				var curCel = column.getEntry (drawColumn, 1, f);
				if (checkedCels.indexOf(curCel) == -1)
				{
					checkedCels.push(curCel);
					frameList.push(f);
				}
			}
			return frameList;
		}		
	}
}