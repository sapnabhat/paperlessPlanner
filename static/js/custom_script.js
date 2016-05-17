
$('.company_edit').on('click',function(){

  $companyId=$(this).attr('company-id');
  $company=$(this).attr('company-name');
  $contact=$(this).attr('company-contact');
  $email=$(this).attr('email-name');
  $appliedOn=$(this).attr('appliedOn-name');
  $status=$(this).attr('status-name');
  $site=$(this).attr('site-name');
  $note=$(this).attr('note-name');
  $followUpOn=$(this).attr('followUpOn-name');
  $reminder=$(this).attr('reminder-name');
  $("#reminder").val(parseInt($reminder));

  var skillArr = $(this).attr('skillsRequired-name').split(',');
  if(jQuery.inArray("C", skillArr) !== -1)
  {
    $('#skillC').attr('checked','true');
  }
  if(jQuery.inArray("C++", skillArr) !== -1)
  {
    $('#skillCpp').attr('checked','true');
  }
  if(jQuery.inArray("Java", skillArr) !== -1)
  {
    $('#skillJava').attr('checked','true');
  }
  $("#company-id").val($companyId);
  $( "#company" ).val($company);
  $( "#contact" ).val($contact);
  $( "#email" ).val($email);
  $( "#appliedOn" ).val($appliedOn);
  $( "#site" ).val($site);
  $( "#note" ).val($note);
  $( "#followOn" ).val($followUpOn);
  $('#myModalHorizontal').modal('show');
  $('#status').val($status);

});

$('#save').on('click',function(){
  $('#updateForm').submit();
});

$('#updateForm').on('submit',function(e){
  e.preventDefault();
  $.ajax({
    type: "POST",
    url: '/form/update',
    data: $("#updateForm").serialize(),
    success: function(data) {
      $('#myModalHorizontal').modal('hide');
      $('tr[company-id="'+data.id+'"] td:nth-child(1) a').html(data.company);
      $('tr[company-id="'+data.id+'"] td:nth-child(2)').html(data.appliedOn);
      switch(data.status)
      {
        case "1": $('tr[company-id="'+data.id+'"] td:nth-child(3)').html("Accepted");
        $('tr[company-id="'+data.id+'"] td:nth-child(1) a').attr('status-name',"1");
        break;
        case "2": $('tr[company-id="'+data.id+'"] td:nth-child(3)').html("Reject");
        $('tr[company-id="'+data.id+'"] td:nth-child(1) a').attr('status-name',"2");
        break;
        case "3": $('tr[company-id="'+data.id+'"] td:nth-child(3)').html("In Progress");
        $('tr[company-id="'+data.id+'"] td:nth-child(1) a').attr('status-name',"3");
        break;
      }
      $('tr[company-id="'+data.id+'"] td:nth-child(4)').html(data.followOn);
      $('tr[company-id="'+data.id+'"] td:nth-child(1) a').attr('company-name',data.company);
      $('tr[company-id="'+data.id+'"] td:nth-child(1) a').attr('appliedon-name',data.appliedOn);
      $('tr[company-id="'+data.id+'"] td:nth-child(1) a').attr('followupon-name',data.followOn);
      console.log(data);
    }
  });
return false;
});

$('#photoFormUpload').on('submit',function(e){
  e.preventDefault();
  $("#status").empty().text("File is uploading...");
  $.ajax({
    url: '/photo',
    type: "POST",
    data: new FormData(this),
    contentType: false,
    cache: false,
    processData: false,
    success: function(data) { 
      $('.profileImage').attr('src','./assets/uploads/'+data.message);
      $("#status").empty().text("Uploaded");
      console.log(data.message);
      // if(data.message == "success")
      // {
      //   $('.toShow').attr('display',block);
      // }      
    }
  });
  return false;
});


$('.profileImage').on('click',function(){

});

$('body').on('click','.user-block',function(e){
  var $id = $(this).data('id');
  $.ajax({
    type: "POST",
    url: '/user/status-update',
    data: { id: $id,status:'0'},
    success: function(data) {
      $('button[data-id="'+$id+'"]').removeClass('btn-danger').removeClass('user-block').addClass('btn-success').addClass('user-activate').html('Activate');
    }
  });
});

$('body').on('click','.user-activate',function(e){
  var $id = $(this).data('id');
  $.ajax({
    type: "POST",
    url: '/user/status-update',
    data: { id: $id,status:'1'},
    success: function(data) {
      $('button[data-id="'+$id+'"]').removeClass('btn-success').removeClass('user-activate').addClass('btn-danger').addClass('user-block').html('Block');
    }
  });
});
